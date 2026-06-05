import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, Vector3, type Material } from "three";
import { DroneModel } from "@/components/drone-viewer/DroneModel";
import { usePilotStore } from "@/pilot/pilotStore";
import { useWindStore } from "@/pilot/windStore";
import { flightRecorder, type FlightSample } from "@/pilot/recorder";
import type { PilotEngine, ControlInput } from "@/pilot/PilotEngine";
import { DRONE_VISUAL_SCALE } from "@/pilot/constants";

function buildSample(engine: PilotEngine, t: number): FlightSample {
  const m = engine.metrics();
  const snap = engine.snapshot();
  return {
    t,
    altitude: m.altitude,
    x: m.posX,
    z: m.posZ,
    vSpeed: m.verticalSpeed,
    gSpeed: m.groundSpeed,
    roll: snap.roll,
    pitch: snap.pitch,
    yaw: snap.yaw,
    throttle: m.throttlePct,
    totalThrust: m.totalThrust,
    worstSf: m.worstSf,
    thrust: snap.arms.map((a) => a.thrust),
    rpm: snap.arms.map((a) => a.rpm),
    sf: snap.arms.map((a) => a.safety_factor),
  };
}

interface PilotDroneProps {
  engine: PilotEngine;
  inputRef: MutableRefObject<ControlInput>;
  controlsRef: MutableRefObject<{ target: Vector3; update: () => void } | null>;
}

const PUBLISH_INTERVAL = 0.066; // s → ~15 Hz al panel

/**
 * Corre la física cada frame y mueve el dron por el mapa de forma imperativa
 * (sin re-render). Reusa el DroneModel existente — así los colores de calor /
 * esfuerzo por motor se mantienen tal cual. La cámara sigue al dron.
 */
export function PilotDrone({ engine, inputRef, controlsRef }: PilotDroneProps) {
  const groupRef = useRef<Group>(null);
  const shadowRef = useRef<Mesh>(null);
  const beamRef = useRef<Mesh>(null);
  const acc = useRef(0);
  const prevTarget = useRef(new Vector3(0, engine.pos[1], 0));
  const tmp = useRef(new Vector3());
  const tmpDelta = useRef(new Vector3());

  // Snapshot reactivo solo para los colores/RPM del modelo (15 Hz).
  const snapshot = usePilotStore((s) => s.snapshot);

  useFrame((state, delta) => {
    // Aplica el clima configurado (botones) al motor en vivo
    const w = useWindStore.getState();
    engine.windSpeed = w.speed;
    engine.windDirRad = (w.dir * Math.PI) / 180;
    engine.gustLevel = w.gust;

    engine.step(inputRef.current, delta);

    // Grabación de vuelo (muestrea a ritmo fijo si está activa)
    if (flightRecorder.recording) {
      flightRecorder.tick(delta, (t) => buildSample(engine, t));
    }

    const [x, y, z] = engine.pos;

    const g = groupRef.current;
    if (g) {
      g.position.set(x, y, z);
      const q = engine.orientation;
      g.quaternion.set(q[0], q[1], q[2], q[3]);
    }

    // Sombra proyectada (crece y se difumina con la altura)
    const sh = shadowRef.current;
    if (sh) {
      sh.position.set(x, 0.04, z);
      const sc = 1 + y * 0.08;
      sh.scale.set(sc, sc, sc);
      (sh.material as Material & { opacity: number }).opacity = Math.max(0.04, 0.32 - y * 0.012);
    }

    // Haz vertical que ancla el dron al mapa
    const bm = beamRef.current;
    if (bm) {
      bm.position.set(x, y / 2, z);
      bm.scale.y = Math.max(0.001, y);
    }

    // Cámara de seguimiento: traslada la cámara con el dron, mira al dron
    const controls = controlsRef.current;
    if (controls) {
      const dronePos = tmp.current.set(x, y, z);
      const d = tmpDelta.current.copy(dronePos).sub(prevTarget.current);
      state.camera.position.add(d);
      controls.target.copy(dronePos);
      prevTarget.current.copy(dronePos);
      controls.update();
    }

    // Publica snapshot + métricas al panel a ritmo moderado
    acc.current += delta;
    if (acc.current >= PUBLISH_INTERVAL) {
      acc.current = 0;
      usePilotStore.getState().publish(engine.snapshot(), engine.metrics());
      if (flightRecorder.recording) {
        usePilotStore.getState().setRecStats(flightRecorder.duration, flightRecorder.count);
      }
    }
  });

  return (
    <>
      <group ref={groupRef} scale={DRONE_VISUAL_SCALE}>
        <DroneModel snapshot={snapshot} />
      </group>

      {/* Sombra en el suelo */}
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {/* Haz de altitud */}
      <mesh ref={beamRef} position={[0, 1, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1, 8]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </>
  );
}
