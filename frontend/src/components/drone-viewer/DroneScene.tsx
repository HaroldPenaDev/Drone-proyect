import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { DroneModel } from "@/components/drone-viewer/DroneModel";
import { ThermalLegend } from "@/components/drone-viewer/ThermalLegend";
import type { DroneSnapshot } from "@/types";
import { useT } from "@/i18n";

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
  return (
    <div
      className={`relative surface overflow-hidden ${height}`}
      style={{
        background:
          "radial-gradient(ellipse at center, #0d0f15 0%, #06070b 80%)",
      }}
    >
      <Canvas
        camera={{ position: [0.55, 0.42, 0.55], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 5, 5]} intensity={0.7} />
        <directionalLight position={[-5, 3, -2]} intensity={0.3} color="#22d3ee" />
        <pointLight position={[0, 1, 0]} intensity={0.4} color="#f59e0b" />

        <DroneModel snapshot={snapshot} />

        <Grid
          args={[10, 10]}
          cellSize={0.1}
          cellThickness={0.5}
          cellColor="#1c2230"
          sectionSize={0.5}
          sectionThickness={1}
          sectionColor="#262d3d"
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
