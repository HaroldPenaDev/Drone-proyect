import { useEffect, useMemo } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useDroneStore } from "@/stores/droneStore";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useMissions } from "@/hooks/useMissions";
import { TelemetryPanel } from "@/components/dashboard/TelemetryPanel";
import { KPICards } from "@/components/dashboard/KPICards";
import { AltitudeCard } from "@/components/dashboard/AltitudeCard";
import { MovementIndicator } from "@/components/dashboard/MovementIndicator";
import { DegradationChart } from "@/components/dashboard/DegradationChart";
import { DroneScene } from "@/components/drone-viewer/DroneScene";
import { AlertBanner } from "@/components/alerts/AlertBanner";
import { PageHeader, Badge } from "@/components/ui";
import { useT } from "@/i18n";

export function DashboardPage() {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const loadDrones = useDroneStore((s) => s.loadDrones);
  const { latestSnapshot, history, connected } = useTelemetry(
    selectedDrone?.id ?? null,
  );
  const { activeMission } = useMissions(selectedDrone?.id ?? null);
  const t = useT();

  useEffect(() => {
    loadDrones();
  }, [loadDrones]);

  const currentMovement = useMemo(() => {
    if (!activeMission || activeMission.status !== "running") return "hover";
    const movements = activeMission.movements ?? [];
    if (movements.length === 0) return "hover";
    if (!activeMission.started_at) return movements[0];
    const elapsedSec = Math.max(
      0,
      (Date.now() - new Date(activeMission.started_at).getTime()) / 1000,
    );
    const stepSeconds = 5;
    const idx = Math.min(
      Math.floor(elapsedSec / stepSeconds),
      movements.length - 1,
    );
    return movements[idx];
  }, [activeMission]);

  const missionActive = activeMission?.status === "running";

  return (
    <div className="space-y-6 animate-fade-in">
      <AlertBanner />

      <PageHeader
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        actions={
          connected ? (
            <Badge tone="good" pulse>
              <Wifi size={11} strokeWidth={2.5} />
              {t("common.connected")}
            </Badge>
          ) : (
            <Badge tone="crit">
              <WifiOff size={11} strokeWidth={2.5} />
              {t("common.disconnected")}
            </Badge>
          )
        }
      />

      <KPICards droneId={selectedDrone?.id ?? null} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <DroneScene snapshot={latestSnapshot} />
        </div>
        <div className="space-y-4">
          <MovementIndicator
            movement={currentMovement}
            missionActive={missionActive}
          />
          <AltitudeCard
            altitude={latestSnapshot?.altitude ?? 0}
            yaw={latestSnapshot?.yaw ?? 0}
            roll={latestSnapshot?.roll ?? 0}
            pitch={latestSnapshot?.pitch ?? 0}
          />
        </div>
      </div>

      <TelemetryPanel snapshot={latestSnapshot} history={history} />

      <DegradationChart data={history} />
    </div>
  );
}
