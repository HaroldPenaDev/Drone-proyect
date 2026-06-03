import { useMemo, useState } from "react";
import { Color } from "three";
import { MotorIndicator } from "@/components/drone-viewer/MotorIndicator";
import { safetyFactorToColor } from "@/components/drone-viewer/thermal";
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
      rpm: (arm.thrust / 8.0) * 12000,
      armRotation: ARM_ROTATIONS[i],
    }));
  }, [snapshot]);

  return (
    <group>
      {/* Central body */}
      <mesh>
        <boxGeometry args={[0.08, 0.03, 0.08]} />
        <meshStandardMaterial color="#1c2230" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Indicator dot on top */}
      <mesh position={[0, 0.018, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.002, 12]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={1.5}
        />
      </mesh>

      {armData.map((arm, index) => {
        const [r, g, b] = safetyFactorToColor(arm.safetyFactor);
        const armColor = new Color(r * 0.5, g * 0.5, b * 0.5); // dimmed thermal tint
        return (
          <group key={index}>
            {/* Arm beam — tinted by SF */}
            <mesh
              position={[arm.position[0] / 2, 0, arm.position[2] / 2]}
              rotation={arm.armRotation}
            >
              <boxGeometry args={[0.25, 0.015, 0.02]} />
              <meshStandardMaterial
                color={armColor}
                emissive={armColor}
                emissiveIntensity={0.15}
                metalness={0.4}
                roughness={0.5}
              />
            </mesh>
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
