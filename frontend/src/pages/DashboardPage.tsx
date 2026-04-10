import { useEffect } from "react";
import { useDroneStore } from "@/stores/droneStore";
import { useTelemetry } from "@/hooks/useTelemetry";
import { TelemetryPanel } from "@/components/dashboard/TelemetryPanel";
import { DroneScene } from "@/components/drone-viewer/DroneScene";
import { AlertBanner } from "@/components/alerts/AlertBanner";

export function DashboardPage() {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const loadDrones = useDroneStore((s) => s.loadDrones);
  const { latestSnapshot, history, connected } = useTelemetry(
    selectedDrone?.id ?? null
  );

  useEffect(() => {
    loadDrones();
  }, [loadDrones]);

  return (
    <div className="space-y-4">
      <AlertBanner />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Dashboard</h2>
        <span
          className={`text-xs px-2 py-1 rounded ${
            connected
              ? "bg-green-900/50 text-green-400"
              : "bg-red-900/50 text-red-400"
          }`}
        >
          {connected ? "Live" : "Disconnected"}
        </span>
      </div>
      <DroneScene snapshot={latestSnapshot} />
      <TelemetryPanel snapshot={latestSnapshot} history={history} />
    </div>
  );
}
