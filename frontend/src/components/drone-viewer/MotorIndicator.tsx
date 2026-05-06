import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

interface MotorIndicatorProps {
  position: [number, number, number];
  degradation: number;
  rpm: number;
}

export function MotorIndicator({ position, degradation, rpm }: MotorIndicatorProps) {
  const propellerRef = useRef<Mesh>(null);

  const color =
    degradation < 0.25 ? "#22c55e" : degradation < 0.6 ? "#f59e0b" : "#ef4444";

  const rotationSpeed = (rpm / 12000) * 0.5;

  useFrame((_state, delta) => {
    if (propellerRef.current) {
      propellerRef.current.rotation.y += rotationSpeed * delta * 60;
    }
  });

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh ref={propellerRef} position={[0, 0.03, 0]}>
        <boxGeometry args={[0.15, 0.005, 0.02]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}
