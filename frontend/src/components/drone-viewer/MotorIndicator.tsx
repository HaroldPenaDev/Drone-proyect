import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Mesh } from "three";
import { Color, DoubleSide } from "three";
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
  const blurRef = useRef<Mesh>(null);
  const t = useT();

  const [r, g, b] = safetyFactorToColor(safetyFactor);
  const color = new Color(r, g, b);
  const rotationSpeed = (rpm / 12000) * 5.0;  // Boosted: visible spin at hover RPM

  useFrame((_state, delta) => {
    if (propellerRef.current) {
      propellerRef.current.rotation.y += rotationSpeed * delta * 60;
    }
    if (haloRef.current) {
      const elapsed = _state.clock.elapsedTime;
      const baseScale = hovered ? 1.5 : 1.0;
      haloRef.current.scale.setScalar(baseScale * (1 + Math.sin(elapsed * 3) * 0.05));
    }
    if (blurRef.current) {
      const targetOpacity = Math.min(0.25, rotationSpeed * 0.4);
      (blurRef.current.material as any).opacity = targetOpacity;
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
      {/* Halo de brillo pulsante (SF color) */}
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <ringGeometry args={[0.04, 0.06, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>

      {/* ===== MOTOR BRUSHLESS DETALLADO ===== */}

      {/* Base / estator */}
      <mesh position={[0, -0.012, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.014, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Bobinas de cobre internas */}
      <mesh position={[0, -0.002, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.018, 12]} />
        <meshStandardMaterial
          color="#d97706"
          emissive="#b45309"
          emissiveIntensity={0.8}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Carcasa exterior del rotor (Rotor Bell) */}
      <mesh position={[0, -0.002, 0]}>
        <cylinderGeometry args={[0.019, 0.019, 0.018, 16, 1, true]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.85}
          side={DoubleSide}
        />
      </mesh>

      {/* Anillo de telemetría (cambia color con SF) */}
      <mesh position={[0, 0.008, 0]}>
        <cylinderGeometry args={[0.019, 0.019, 0.003, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Eje de acero */}
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.024, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ===== HÉLICE TRIPALA ===== */}

      {/* Disco de motion blur (opacidad dinámica según RPM) */}
      <mesh ref={blurRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.022, 0]}>
        <ringGeometry args={[0.006, 0.08, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.0} depthWrite={false} />
      </mesh>

      {/* Grupo giratoria de la hélice */}
      <mesh ref={propellerRef} position={[0, 0.026, 0]}>
        {/* Hub central */}
        <mesh>
          <cylinderGeometry args={[0.006, 0.006, 0.006, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.003, 0]}>
          <sphereGeometry args={[0.005, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Pala 1 */}
        <group rotation={[0, 0, 0]}>
          <mesh position={[0, 0.001, 0.04]} rotation={[0.08, 0, 0.02]}>
            <boxGeometry args={[0.01, 0.0015, 0.08]} />
            <meshStandardMaterial color="#cbd5e1" transparent opacity={0.65} metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.001, 0.078]} rotation={[0.08, 0, 0.02]}>
            <boxGeometry args={[0.01, 0.0018, 0.005]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
          </mesh>
        </group>

        {/* Pala 2 */}
        <group rotation={[0, (2 * Math.PI) / 3, 0]}>
          <mesh position={[0, 0.001, 0.04]} rotation={[0.08, 0, 0.02]}>
            <boxGeometry args={[0.01, 0.0015, 0.08]} />
            <meshStandardMaterial color="#cbd5e1" transparent opacity={0.65} metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.001, 0.078]} rotation={[0.08, 0, 0.02]}>
            <boxGeometry args={[0.01, 0.0018, 0.005]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
          </mesh>
        </group>

        {/* Pala 3 */}
        <group rotation={[0, (4 * Math.PI) / 3, 0]}>
          <mesh position={[0, 0.001, 0.04]} rotation={[0.08, 0, 0.02]}>
            <boxGeometry args={[0.01, 0.0015, 0.08]} />
            <meshStandardMaterial color="#cbd5e1" transparent opacity={0.65} metalness={0.3} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.001, 0.078]} rotation={[0.08, 0, 0.02]}>
            <boxGeometry args={[0.01, 0.0018, 0.005]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
          </mesh>
        </group>
      </mesh>

      {/* ===== TOOLTIP INTERACTIVO ===== */}
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
