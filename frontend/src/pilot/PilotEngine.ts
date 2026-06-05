/**
 * PilotEngine — motor de física 6-DOF con piloto automático, corriendo en el
 * navegador a ~60 fps. Lazo cerrado: recibe comandos de alto nivel (lo que el
 * teclado pide) y un controlador en cascada calcula el empuje de cada motor
 * para mover el dron de forma estable, como el autopiloto del dron real.
 *
 * Sin dependencias de three.js: implementa su propia matemática de quaternion
 * para que sea idéntico al prototipo verificado y testeable de forma aislada.
 */
import type { DroneSnapshot } from "@/types";
import {
  MASS_KG,
  GRAVITY,
  MAX_THRUST_N,
  INERTIA_XX,
  INERTIA_YY,
  INERTIA_ZZ,
  HOVER_THRUST_N,
  MOTOR_POSITIONS,
  MOTOR_SPIN,
  SECTION_C_M,
  SECTION_I_M4,
  ARM_LENGTH_M,
  ONYX_STRENGTH_MPA,
  FATIGUE_EXPONENT,
  DEGRADATION_RATE,
  KP_ATT,
  KD_ATT,
  KP_YAW,
  KP_ALT,
  KP_VZ,
  DRAG_H,
  GUST_DECAY,
  GUST_KICK,
  GUST_TORQUE,
  PITCH_MAX,
  ROLL_MAX,
  YAWRATE_MAX,
  CLIMB_RATE,
  MIN_ALT,
  MAX_ALT,
  GROUND_Y,
  START_ALT,
  motorTorque,
  rpmFromThrust,
} from "@/pilot/constants";

/** Comando normalizado [-1..1] que produce el teclado. */
export interface ControlInput {
  pitch: number; // + adelante
  roll: number; // + izquierda
  yaw: number; // + giro
  climb: number; // + subir
}

/** Métricas legibles para el panel en vivo. */
export interface PilotMetrics {
  altitude: number;
  verticalSpeed: number;
  groundSpeed: number;
  posX: number;
  posZ: number;
  rollDeg: number;
  pitchDeg: number;
  yawDeg: number;
  throttlePct: number;
  totalThrust: number;
  worstSf: number;
  targetAlt: number;
  distance: number;
  flightTime: number;
  windSpeed: number;
  windDir: number;
}

type Vec3 = [number, number, number];
type Quat = [number, number, number, number]; // x, y, z, w

const SUBSTEP = 0.0025; // paso de integración interno (s)
const MAX_FRAME = 0.05; // recorta saltos grandes de tiempo (s)

// ---------- Quaternion / vectores ----------
function qMul(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}
function qNorm(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}
function rotByQ(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}
/** Euler en orden YXZ (idéntico a three): {roll(z), pitch(x), yaw(y)}. */
function eulerYXZ(q: Quat): { roll: number; pitch: number; yaw: number } {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const m11 = 1 - (yy + zz);
  const m13 = xz + wy;
  const m21 = xy + wz;
  const m22 = 1 - (xx + zz);
  const m23 = yz - wx;
  const m31 = xz - wy;
  const m33 = 1 - (xx + yy);
  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  const pitch = Math.asin(-clamp(m23));
  let yaw: number;
  let roll: number;
  if (Math.abs(m23) < 0.9999999) {
    yaw = Math.atan2(m13, m33);
    roll = Math.atan2(m21, m22);
  } else {
    yaw = Math.atan2(-m31, m11);
    roll = 0;
  }
  return { roll, pitch, yaw };
}

function bendingStressMpa(thrust: number): number {
  return (Math.abs(thrust) * ARM_LENGTH_M * SECTION_C_M) / SECTION_I_M4 / 1e6;
}

export class PilotEngine {
  pos: Vec3 = [0, START_ALT, 0];
  vel: Vec3 = [0, 0, 0];
  quat: Quat = [0, 0, 0, 1];
  angVel: Vec3 = [0, 0, 0]; // [p sobre X, q sobre Y, r sobre Z]
  deg: number[] = [0, 0, 0, 0];
  motors: number[] = [HOVER_THRUST_N, HOVER_THRUST_N, HOVER_THRUST_N, HOVER_THRUST_N];
  targetAlt = START_ALT;
  distance = 0;
  time = 0;

  // Viento (configurado desde la UI) + estado interno de ráfaga
  windSpeed = 0; // m/s base
  windDirRad = 0; // dirección hacia la que sopla
  gustLevel = 0; // 0..1 intensidad de ráfagas
  private gustX = 0;
  private gustZ = 0;
  curWindX = 0; // viento instantáneo (base + ráfaga)
  curWindZ = 0;

  reset(): void {
    this.pos = [0, START_ALT, 0];
    this.vel = [0, 0, 0];
    this.quat = [0, 0, 0, 1];
    this.angVel = [0, 0, 0];
    this.deg = [0, 0, 0, 0];
    this.motors = [HOVER_THRUST_N, HOVER_THRUST_N, HOVER_THRUST_N, HOVER_THRUST_N];
    this.targetAlt = START_ALT;
    this.distance = 0;
    this.time = 0;
    this.gustX = 0;
    this.gustZ = 0;
    this.curWindX = 0;
    this.curWindZ = 0;
  }

  /** Avanza la simulación `frameDt` segundos (con subpasos internos fijos). */
  step(input: ControlInput, frameDt: number): void {
    const dtFrame = Math.min(Math.max(frameDt, 0), MAX_FRAME);
    const nSub = Math.max(1, Math.round(dtFrame / SUBSTEP));
    const dt = dtFrame / nSub;
    for (let i = 0; i < nSub; i++) this.substep(input, dt);
    // Salvaguarda: si algo se desestabiliza numéricamente, reinicia en vez de
    // dejar la página con NaN.
    if (!Number.isFinite(this.pos[1]) || Math.abs(this.pos[0]) > 1e5) this.reset();
  }

  private substep(input: ControlInput, dt: number): void {
    const pitchSp = input.pitch * PITCH_MAX;
    const rollSp = input.roll * ROLL_MAX;
    const yawRateSp = input.yaw * YAWRATE_MAX;
    this.targetAlt = Math.max(
      MIN_ALT,
      Math.min(MAX_ALT, this.targetAlt + input.climb * CLIMB_RATE * dt),
    );

    const { roll, pitch } = eulerYXZ(this.quat);
    const [p, qy, r] = this.angVel;

    // --- Controlador de actitud (PD) ---
    const uRoll = KP_ATT * (rollSp - roll) - KD_ATT * r;
    const uPitch = KP_ATT * (pitchSp - pitch) - KD_ATT * p;
    const uYaw = KP_YAW * (yawRateSp - qy);

    // --- Controlador de altitud (cascada: alt → vel vertical → empuje) ---
    const eAlt = this.targetAlt - this.pos[1];
    const climbCmd = Math.max(-2.5, Math.min(2.5, KP_ALT * eAlt));
    let uTotal = MASS_KG * GRAVITY + KP_VZ * (climbCmd - this.vel[1]) * MASS_KG;
    const up = rotByQ(this.quat, [0, 1, 0]);
    uTotal /= Math.max(0.5, up[1]); // compensación de inclinación
    const uT = uTotal / 4;

    // --- Mixer en cruz (+) → empuje por motor, recortado a físico ---
    const T = [
      uT + uRoll + uYaw, // M0 Derecho
      uT - uPitch - uYaw, // M1 Frontal
      uT - uRoll + uYaw, // M2 Izquierdo
      uT + uPitch - uYaw, // M3 Trasero
    ].map((t) => Math.max(0, Math.min(MAX_THRUST_N, t)));
    this.motors = T;

    // --- Traslación (Newton) ---
    const thrustSum = T[0] + T[1] + T[2] + T[3];
    const Fw = rotByQ(this.quat, [0, thrustSum, 0]);
    Fw[1] -= MASS_KG * GRAVITY;
    // Viento + ráfagas: la ráfaga decae y recibe golpes aleatorios.
    const gustScale = GUST_KICK * this.gustLevel * Math.max(this.windSpeed, 2);
    this.gustX = this.gustX * GUST_DECAY + (Math.random() - 0.5) * 2 * gustScale;
    this.gustZ = this.gustZ * GUST_DECAY + (Math.random() - 0.5) * 2 * gustScale;
    this.curWindX = this.windSpeed * Math.cos(this.windDirRad) + this.gustX;
    this.curWindZ = this.windSpeed * Math.sin(this.windDirRad) + this.gustZ;
    // Arrastre relativo al aire en movimiento → el viento empuja al dron.
    Fw[0] -= DRAG_H * (this.vel[0] - this.curWindX);
    Fw[2] -= DRAG_H * (this.vel[2] - this.curWindZ);
    const prevX = this.pos[0];
    const prevZ = this.pos[2];
    this.vel = [
      this.vel[0] + (Fw[0] / MASS_KG) * dt,
      this.vel[1] + (Fw[1] / MASS_KG) * dt,
      this.vel[2] + (Fw[2] / MASS_KG) * dt,
    ];
    this.pos = [
      this.pos[0] + this.vel[0] * dt,
      this.pos[1] + this.vel[1] * dt,
      this.pos[2] + this.vel[2] * dt,
    ];
    if (this.pos[1] < GROUND_Y) {
      this.pos[1] = GROUND_Y;
      if (this.vel[1] < 0) this.vel[1] = 0;
    }
    this.distance += Math.hypot(this.pos[0] - prevX, this.pos[2] - prevZ);
    this.time += dt;

    // --- Rotación (Euler) ---
    let tx = 0;
    let ty = 0;
    let tz = 0;
    for (let i = 0; i < 4; i++) {
      const rx = MOTOR_POSITIONS[i][0];
      const rz = MOTOR_POSITIONS[i][2];
      const Ti = T[i];
      // cross(r, [0,Ti,0]) = [-rz*Ti, 0, rx*Ti]
      tx += -rz * Ti;
      tz += rx * Ti;
      ty += MOTOR_SPIN[i] * motorTorque(Ti);
    }
    // El viento no golpea uniforme → torque que tambalea el dron (el PID lo recupera).
    tx += this.gustZ * GUST_TORQUE;
    tz += -this.gustX * GUST_TORQUE;
    this.angVel = [
      this.angVel[0] + (tx / INERTIA_XX) * dt,
      this.angVel[1] + (ty / INERTIA_YY) * dt,
      this.angVel[2] + (tz / INERTIA_ZZ) * dt,
    ];
    const mag = Math.hypot(this.angVel[0], this.angVel[1], this.angVel[2]);
    if (mag > 1e-9) {
      const half = (mag * dt) / 2;
      const s = Math.sin(half) / mag;
      const dq: Quat = [
        this.angVel[0] * s,
        this.angVel[1] * s,
        this.angVel[2] * s,
        Math.cos(half),
      ];
      this.quat = qNorm(qMul(this.quat, dq));
    }

    // --- Fatiga acumulada (Wöhler + Miner, escalada al tiempo real) ---
    for (let i = 0; i < 4; i++) {
      const eff = ONYX_STRENGTH_MPA * (1 - this.deg[i]);
      const stress = bendingStressMpa(T[i]);
      if (eff > 0 && stress > 0) {
        const ratio = stress / eff;
        if (ratio < 1) {
          const nFail = Math.pow(1 / ratio, FATIGUE_EXPONENT);
          this.deg[i] = Math.min(1, this.deg[i] + (1 / nFail) * DEGRADATION_RATE * dt);
        } else {
          this.deg[i] = Math.min(1, this.deg[i] + DEGRADATION_RATE * dt);
        }
      }
    }
  }

  private safetyFactor(i: number): number {
    const stress = bendingStressMpa(this.motors[i]);
    if (stress <= 0) return 10;
    const eff = ONYX_STRENGTH_MPA * (1 - this.deg[i]);
    return eff / stress;
  }

  /** Quaternion de orientación para mover el grupo 3D del dron. */
  get orientation(): Quat {
    return this.quat;
  }

  snapshot(): DroneSnapshot {
    const e = eulerYXZ(this.quat);
    const arms = [0, 1, 2, 3].map((i) => ({
      arm_index: i,
      thrust: this.motors[i],
      torque: motorTorque(this.motors[i]),
      rpm: rpmFromThrust(this.motors[i]),
      safety_factor: this.safetyFactor(i),
      degradation_factor: this.deg[i],
    })) as DroneSnapshot["arms"];
    return {
      drone_id: "pilot-live",
      timestamp: "",
      arms,
      altitude: this.pos[1],
      roll: e.roll,
      pitch: e.pitch,
      yaw: e.yaw,
    };
  }

  metrics(): PilotMetrics {
    const e = eulerYXZ(this.quat);
    const totalThrust = this.motors.reduce((a, b) => a + b, 0);
    let worst = Infinity;
    for (let i = 0; i < 4; i++) worst = Math.min(worst, this.safetyFactor(i));
    const deg = (rad: number) => (rad * 180) / Math.PI;
    return {
      altitude: this.pos[1],
      verticalSpeed: this.vel[1],
      groundSpeed: Math.hypot(this.vel[0], this.vel[2]),
      posX: this.pos[0],
      posZ: this.pos[2],
      rollDeg: deg(e.roll),
      pitchDeg: deg(e.pitch),
      yawDeg: deg(e.yaw),
      throttlePct: (totalThrust / (4 * MAX_THRUST_N)) * 100,
      totalThrust,
      worstSf: worst,
      targetAlt: this.targetAlt,
      distance: this.distance,
      flightTime: this.time,
      windSpeed: Math.hypot(this.curWindX, this.curWindZ),
      windDir: (Math.atan2(this.curWindZ, this.curWindX) * 180) / Math.PI,
    };
  }
}
