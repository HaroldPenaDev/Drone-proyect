import { useMemo, useState } from "react";
import { Color } from "three";
import { MotorIndicator } from "@/components/drone-viewer/MotorIndicator";
import { safetyFactorToColor } from "@/components/drone-viewer/thermal";
import type { DroneSnapshot } from "@/types";

interface DroneModelProps {
  snapshot: DroneSnapshot | null;
}

// + frame: arms go straight in the 4 cardinal directions
const ARM_POSITIONS: [number, number, number][] = [
  [ 0.25, 0,  0   ],  // Right
  [ 0,    0,  0.25],  // Front
  [-0.25, 0,  0   ],  // Left
  [ 0,    0, -0.25],  // Back
];

const ARM_ROTATIONS: [number, number, number][] = [
  [0,  0,          0],
  [0,  Math.PI / 2, 0],
  [0,  Math.PI,    0],
  [0, -Math.PI / 2, 0],
];

export function DroneModel({ snapshot }: DroneModelProps) {
  const [hoveredArm, setHoveredArm] = useState<number | null>(null);

  const armData = useMemo(() => {
    if (!snapshot) {
      return ARM_POSITIONS.map((pos, i) => ({
        position: pos,
        safetyFactor: 10,
        degradation: 0,
        thrust: 0,
        torque: 0,
        rpm: 0,
        armRotation: ARM_ROTATIONS[i],
      }));
    }
    return snapshot.arms.map((arm, i) => ({
      position: ARM_POSITIONS[i],
      safetyFactor: arm.safety_factor,
      degradation: arm.degradation_factor,
      thrust: arm.thrust,
      torque: arm.torque,
      rpm: arm.rpm ?? (arm.thrust / 8.0) * 12000,  // Use server rpm; fallback to computed
      armRotation: ARM_ROTATIONS[i],
    }));
  }, [snapshot]);

  return (
    <group>
      {/* ===== CHASIS CENTRAL (sándwich de fibra de carbono) ===== */}

      {/* Placa inferior */}
      <mesh position={[0, -0.012, 0]}>
        <boxGeometry args={[0.09, 0.002, 0.09]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Placa superior */}
      <mesh position={[0, 0.008, 0]}>
        <boxGeometry args={[0.09, 0.002, 0.09]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Espaciadores (standoffs) de aluminio en las cuatro esquinas */}
      {([[ 0.04,  0.04], [ 0.04, -0.04], [-0.04,  0.04], [-0.04, -0.04]] as [number,number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, -0.002, z]}>
          <cylinderGeometry args={[0.002, 0.002, 0.018, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* Cúpula central (canopy) — parte baja */}
      <mesh position={[0, 0.017, 0]}>
        <boxGeometry args={[0.065, 0.014, 0.075]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Cúpula central — parte alta */}
      <mesh position={[0, 0.026, -0.005]}>
        <boxGeometry args={[0.045, 0.01, 0.055]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* LED GPS / estado (cian pulsante) */}
      <mesh position={[0, 0.032, 0.005]}>
        <cylinderGeometry args={[0.006, 0.006, 0.002, 16]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0.032, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.006, 0.009, 16]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.3} />
      </mesh>

      {/* ===== TREN DE ATERRIZAJE ===== */}
      {([-0.032, 0.032] as number[]).map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          {/* Soporte delantero */}
          <mesh position={[0, -0.03, 0.03]} rotation={[0.2, 0, 0]}>
            <cylinderGeometry args={[0.002, 0.002, 0.04]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Soporte trasero */}
          <mesh position={[0, -0.03, -0.03]} rotation={[-0.2, 0, 0]}>
            <cylinderGeometry args={[0.002, 0.002, 0.04]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Barra horizontal de apoyo */}
          <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0025, 0.0025, 0.1, 8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* ===== CÁMARA FPV FRONTAL ===== */}
      <group position={[0, -0.015, 0.038]}>
        {/* Soporte */}
        <mesh position={[0, -0.008, 0.002]}>
          <boxGeometry args={[0.006, 0.015, 0.006]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.4} />
        </mesh>
        {/* Cuerpo de la cámara */}
        <mesh position={[0, -0.015, 0.006]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.012, 0.01, 0.01]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Barril del lente */}
        <mesh position={[0, -0.015, 0.011]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.003, 12]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Vidrio del lente (brillo azul) */}
        <mesh position={[0, -0.015, 0.0127]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.001, 12]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.8} metalness={1.0} roughness={0.05} />
        </mesh>
      </group>

      {/* ===== LUCES LED DE NAVEGACIÓN ===== */}
      {/* Frontales (cian) */}
      {([-0.025, 0.025] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.005, 0.046]}>
          <sphereGeometry args={[0.0025, 8, 8]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
      ))}
      {/* Traseros (rojo) */}
      {([-0.025, 0.025] as number[]).map((x, i) => (
        <mesh key={i} position={[x, 0.005, -0.046]}>
          <sphereGeometry args={[0.0025, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      ))}

      {/* ===== BRAZOS + MOTORES (+ frame) ===== */}
      {armData.map((arm, index) => {
        const [r, g, b] = safetyFactorToColor(arm.safetyFactor);
        const ledColor = new Color(r * 0.8, g * 0.8, b * 0.8);
        return (
          <group key={index}>
            {/* Grupo del brazo, centrado en el punto medio entre chasis y motor */}
            <group
              position={[arm.position[0] / 2, 0, arm.position[2] / 2]}
              rotation={arm.armRotation}
            >
              {/* Tubo superior de carbono */}
              <mesh position={[0, 0.003, 0.007]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.003, 0.003, 0.24, 8]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
              </mesh>
              {/* Tubo inferior de carbono */}
              <mesh position={[0, 0.003, -0.007]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.003, 0.003, 0.24, 8]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
              </mesh>
              {/* Abrazadera interna */}
              <mesh position={[-0.09, 0, 0]}>
                <boxGeometry args={[0.005, 0.009, 0.02]} />
                <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.4} />
              </mesh>
              {/* Abrazadera externa */}
              <mesh position={[0.09, 0, 0]}>
                <boxGeometry args={[0.005, 0.009, 0.02]} />
                <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.4} />
              </mesh>
              {/* Tira LED de telemetría (color por SF) */}
              <mesh position={[0, 0.006, 0]}>
                <boxGeometry args={[0.22, 0.0015, 0.003]} />
                <meshStandardMaterial
                  color={ledColor}
                  emissive={ledColor}
                  emissiveIntensity={1.5}
                />
              </mesh>
            </group>

            {/* Motor montado en el extremo del brazo (coordenadas del mundo) */}
            <MotorIndicator
              position={arm.position}
              armIndex={index}
              safetyFactor={arm.safetyFactor}
              degradation={arm.degradation}
              thrust={arm.thrust}
              torque={arm.torque}
              rpm={arm.rpm}
              hovered={hoveredArm === index}
              onHover={setHoveredArm}
            />
          </group>
        );
      })}
    </group>
  );
}
