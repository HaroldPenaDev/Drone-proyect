import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Mesh } from "three";
import { Color } from "three";
import { safetyFactorToColor } from "@/components/drone-viewer/thermal";
import { ARM_LABEL_KEYS } from "@/utils/constants";
import { useT } from "@/i18n";

interface MotorIndicatorProps {
  position: [number, number, number];
  armIndex: number;
  safetyFactor: number;
  degradation: number;
  thrust: number;
  torque: number;
  rpm: number;
  hovered: boolean;
  onHover: (armIndex: number | null) => void;
}

export function MotorIndicator({
  position,
  armIndex,
  safetyFactor,
  degradation,
  thrust,
  torque,
  rpm,
  hovered,
  onHover,
}: MotorIndicatorProps) {
  const propellerRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const t = useT();

  const [r, g, b] = safetyFactorToColor(safetyFactor);
  const color = new Color(r, g, b);
  const rotationSpeed = (rpm / 12000) * 0.5;

  useFrame((_state, delta) => {
    if (propellerRef.current) {
      propellerRef.current.rotation.y += rotationSpeed * delta * 60;
    }
    if (haloRef.current) {
      const t = _state.clock.elapsedTime;
      const baseScale = hovered ? 1.5 : 1.0;
      haloRef.current.scale.setScalar(
        baseScale * (1 + Math.sin(t * 3) * 0.05),
      );
    }
  });

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(armIndex);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Halo glow ring */}
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[0.04, 0.06, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      {/* Motor body */}
      <mesh>
        <cylinderGeometry args={[0.03, 0.03, 0.04, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.6 : 0.25}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      {/* Propeller */}
      <mesh ref={propellerRef} position={[0, 0.03, 0]}>
        <boxGeometry args={[0.15, 0.005, 0.02]} />
        <meshStandardMaterial color="#cbd5e1" transparent opacity={0.7} />
      </mesh>

      {hovered && (
        <Html
          position={[0, 0.1, 0]}
          center
          distanceFactor={0.5}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div className="surface px-3 py-2 min-w-[160px] shadow-2xl animate-fade-in">
            <div className="eyebrow-accent mb-1">{t(ARM_LABEL_KEYS[armIndex])}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
              <span className="text-ink-500">{t("sf.short")}</span>
              <span className="font-mono font-semibold text-white text-right">
                {safetyFactor.toFixed(2)}
              </span>
              <span className="text-ink-500">{t("analysis.radar.thrust")}</span>
              <span className="font-mono text-white text-right">
                {thrust.toFixed(2)} N
              </span>
              <span className="text-ink-500">{t("analysis.radar.torque")}</span>
              <span className="font-mono text-white text-right">
                {torque.toFixed(3)} Nm
              </span>
              <span className="text-ink-500">RPM</span>
              <span className="font-mono text-white text-right">
                {Math.round(rpm).toLocaleString()}
              </span>
              <span className="text-ink-500">{t("material.degradation")}</span>
              <span className="font-mono text-white text-right">
                {(degradation * 100).toFixed(4)}%
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
