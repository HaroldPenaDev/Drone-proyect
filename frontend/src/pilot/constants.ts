/**
 * Constantes físicas del módulo de pilotaje en vivo.
 *
 * Espejan las del simulador Python (drone_specs / motor_specs / structural /
 * material_properties) para que el comportamiento sea coherente con el resto
 * del gemelo digital. Convención de ejes three.js: Y = arriba, X = derecha,
 * Z = adelante (el motor Frontal apunta hacia +Z).
 */

// --- Cuerpo del dron ---
export const MASS_KG = 1.2;
export const GRAVITY = 9.81;
export const ARM_LENGTH_M = 0.25;
export const HOVER_THRUST_N = (MASS_KG * GRAVITY) / 4; // 2.943 N por motor
export const MAX_THRUST_N = 8.0;
export const MAX_RPM = 12000;

// Tensor de inercia (modelo de 2 barras cruzadas, igual que el simulador)
const ARM_MASS_KG = 0.08;
export const INERTIA_XX = (2 * ARM_MASS_KG * ARM_LENGTH_M ** 2) / 3; // ≈0.00333
export const INERTIA_YY = INERTIA_XX;
export const INERTIA_ZZ = (4 * ARM_MASS_KG * ARM_LENGTH_M ** 2) / 3; // ≈0.00667

// --- Estructural (factor de seguridad instantáneo) ---
export const SECTION_C_M = 0.005; // distancia al eje neutro (altura/2)
export const SECTION_I_M4 = 5.2e-10; // momento de inercia de sección
export const ONYX_STRENGTH_MPA = 36.0; // resistencia a tracción del ONYX
export const FATIGUE_EXPONENT = 10.0; // exponente de fatiga (curva S-N)
export const DEGRADATION_RATE = 0.6; // escala de fatiga para vuelo en vivo

// --- Geometría de motores (frame del cuerpo, Y-up) ---
export const MOTOR_POSITIONS: ReadonlyArray<readonly [number, number, number]> = [
  [ARM_LENGTH_M, 0, 0], // M0 Derecho
  [0, 0, ARM_LENGTH_M], // M1 Frontal
  [-ARM_LENGTH_M, 0, 0], // M2 Izquierdo
  [0, 0, -ARM_LENGTH_M], // M3 Trasero
];
// Pares contrarrotantes para cancelar el yaw en hover
export const MOTOR_SPIN: readonly number[] = [1, -1, 1, -1];

// --- Ganancias del piloto automático (cascada PID) ---
export const KP_ATT = 6.0; // actitud (roll/pitch) proporcional
export const KD_ATT = 1.2; // actitud derivativo (amortiguamiento)
export const KP_YAW = 0.8; // yaw rate proporcional
export const KP_ALT = 1.5; // altitud → velocidad vertical deseada
export const KP_VZ = 6.0; // velocidad vertical → empuje
export const DRAG_H = 0.35; // arrastre horizontal (estabiliza y frena)

// --- Límites de setpoint (lo que el teclado puede pedir) ---
export const PITCH_MAX = 0.35; // ≈20°
export const ROLL_MAX = 0.35;
export const YAWRATE_MAX = 1.2; // rad/s
export const CLIMB_RATE = 3.0; // m/s de cambio de altitud objetivo
export const MIN_ALT = 0.25;
export const MAX_ALT = 60;
export const GROUND_Y = 0.25; // altura del centro del dron posado (tren apoyado)
export const START_ALT = 2.0;

/** Escala visual del modelo 3D (la física usa metros reales). */
export const DRONE_VISUAL_SCALE = 5;

// --- Viento / ráfagas ---
export const MAX_WIND_SPEED = 15; // m/s
export const GUST_DECAY = 0.995; // persistencia de la ráfaga por subpaso
export const GUST_KICK = 0.05; // escala del golpe aleatorio de ráfaga
export const GUST_TORQUE = 0.012; // torque de perturbación que tambalea el dron

// --- Curvas de motor ---
export function motorTorque(thrust: number): number {
  return 0.009 * thrust * thrust + 0.145 * thrust + 0.0005;
}
export function rpmFromThrust(thrust: number): number {
  return Math.min((thrust / MAX_THRUST_N) * MAX_RPM, MAX_RPM);
}
