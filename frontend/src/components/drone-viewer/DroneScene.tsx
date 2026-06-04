import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { DroneModel } from "@/components/drone-viewer/DroneModel";
import { ThermalLegend } from "@/components/drone-viewer/ThermalLegend";
import type { DroneSnapshot } from "@/types";
import { useT } from "@/i18n";
import { useThemeStore } from "@/stores";

interface DroneSceneProps {
  snapshot: DroneSnapshot | null;
  height?: string;
  showLegend?: boolean;
}

export function DroneScene({
  snapshot,
  height = "h-[440px]",
  showLegend = true,
}: DroneSceneProps) {
  const t = useT();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  return (
    <div
      className={`relative surface overflow-hidden ${height} scene-bg`}
    >
      <Canvas
        camera={{ position: [0.55, 0.42, 0.55], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={isDark ? 0.35 : 0.6} />
        <directionalLight position={[5, 5, 5]} intensity={isDark ? 0.7 : 0.8} />
        <directionalLight position={[-5, 3, -2]} intensity={0.3} color="#22d3ee" />
        <pointLight position={[0, 1, 0]} intensity={0.4} color="#f59e0b" />

        <DroneModel snapshot={snapshot} />

        <Grid
          args={[10, 10]}
          cellSize={0.1}
          cellThickness={0.5}
          cellColor={isDark ? "#1c2230" : "#cbd5e1"}
          sectionSize={0.5}
          sectionThickness={1}
          sectionColor={isDark ? "#262d3d" : "#94a3b8"}
          fadeDistance={3}
          fadeStrength={1.5}
          position={[0, -0.1, 0]}
        />
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={0.3}
          maxDistance={3}
          autoRotate={!snapshot}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      {showLegend && <ThermalLegend />}

      {snapshot && (
        <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
          <div className="live-dot" />
          <span className="text-[11px] font-mono text-ink-500 uppercase tracking-wider">
            {t("common.realTime")}
          </span>
        </div>
      )}
      {!snapshot && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-ink-500 text-sm font-display">{t("common.waitingTelemetry")}</div>
            <div className="text-ink-500/60 text-[11px] font-mono mt-1">
              {t("common.startMission")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

