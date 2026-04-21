import { useEffect } from "react";
import { useDroneStore } from "@/stores/droneStore";
import { useTelemetry } from "@/hooks/useTelemetry";
import { TelemetryPanel } from "@/components/dashboard/TelemetryPanel";
import { DroneScene } from "@/components/drone-viewer/DroneScene";
import { AlertBanner } from "@/components/alerts/AlertBanner";
import { MovementIndicator } from "@/components/dashboard/MovementIndicator";
import { AltitudeCard } from "@/components/dashboard/AltitudeCard";
import { RPMBars } from "@/components/dashboard/RPMBars";
import { KPICards } from "@/components/dashboard/KPICards";

export function DashboardPage() {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const loadDrones = useDroneStore((s) => s.loadDrones);
  const { latestSnapshot, history, connected } = useTelemetry(
    selectedDrone?.id ?? null
  );

  useEffect(() => {
    loadDrones();
  }, [loadDrones]);

  const currentMovement = latestSnapshot?.current_movement ?? "hover";
  const missionActive = currentMovement !== "hover";
  const altitude = latestSnapshot?.position?.z ?? 0;
  const yaw = latestSnapshot?.position?.yaw ?? 0;
  const roll = latestSnapshot?.position?.roll ?? 0;
  const pitch = latestSnapshot?.position?.pitch ?? 0;

  return (
    <div className="space-y-4">
      <AlertBanner />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Panel Principal</h2>
        <span
          className={`text-xs px-2 py-1 rounded ${
            connected
              ? "bg-green-900/50 text-green-400"
              : "bg-red-900/50 text-red-400"
          }`}
        >
          {connected ? "En vivo" : "Desconectado"}
        </span>
      </div>
      <KPICards droneId={selectedDrone?.id ?? null} />
      <MovementIndicator movement={currentMovement} missionActive={missionActive} />
      <div className="grid grid-cols-2 gap-4">
        <AltitudeCard altitude={altitude} yaw={yaw} roll={roll} pitch={pitch} />
        {latestSnapshot && <RPMBars arms={latestSnapshot.arms} />}
      </div>
      <DroneScene snapshot={latestSnapshot} />
      <TelemetryPanel snapshot={latestSnapshot} history={history} />
    </div>
  );
}
