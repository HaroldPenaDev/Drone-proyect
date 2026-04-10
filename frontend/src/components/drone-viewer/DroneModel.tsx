import { useMemo } from "react";
import { MotorIndicator } from "@/components/drone-viewer/MotorIndicator";
import type { DroneSnapshot } from "@/types";

interface DroneModelProps {
  snapshot: DroneSnapshot | null;
}

const ARM_POSITIONS: [number, number, number][] = [
  [0.25, 0, 0],
  [0, 0, 0.25],
  [-0.25, 0, 0],
  [0, 0, -0.25],
];

const ARM_ROTATIONS: [number, number, number][] = [
  [0, 0, 0],
  [0, Math.PI / 2, 0],
  [0, 0, 0],
  [0, Math.PI / 2, 0],
];

export function DroneModel({ snapshot }: DroneModelProps) {
  const armData = useMemo(() => {
    if (!snapshot) {
      return ARM_POSITIONS.map((pos, i) => ({
        position: pos,
        degradation: 0,
        rpm: 0,
        armRotation: ARM_ROTATIONS[i],
      }));
    }
    return snapshot.arms.map((arm, i) => ({
      position: ARM_POSITIONS[i],
      degradation: arm.degradation_factor,
      rpm: (arm.thrust / 8.0) * 12000,
      armRotation: ARM_ROTATIONS[i],
    }));
  }, [snapshot]);

  return (
    <group>
      <mesh>
        <boxGeometry args={[0.08, 0.03, 0.08]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      {armData.map((arm, index) => (
        <group key={index}>
          <mesh position={[arm.position[0] / 2, 0, arm.position[2] / 2]} rotation={arm.armRotation}>
            <boxGeometry args={[0.25, 0.015, 0.02]} />
            <meshStandardMaterial color="#64748b" />
          </mesh>
          <MotorIndicator
            position={arm.position}
            degradation={arm.degradation}
            rpm={arm.rpm}
          />
        </group>
      ))}
    </group>
  );
}
