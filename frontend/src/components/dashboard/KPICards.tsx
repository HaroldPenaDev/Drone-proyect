import { useEffect, useState } from "react";
import { Clock, Trophy, ShieldAlert, Activity } from "lucide-react";
import type { DroneKpis } from "@/types";
import { apiClient } from "@/api/client";
import { Metric } from "@/components/ui";
import { useT } from "@/i18n";

interface KPICardsProps {
  droneId: string | null;
}

const formatFlightTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

export function KPICards({ droneId }: KPICardsProps) {
  const [kpis, setKpis] = useState<DroneKpis | null>(null);
  const t = useT();

  useEffect(() => {
    if (!droneId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await apiClient.get<DroneKpis>(`/kpis/${droneId}`);
        if (!cancelled) setKpis(response.data);
      } catch {
        /* silent */
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [droneId]);

  const sf = kpis?.worst_safety_factor ?? 10;
  const sfTone = sf < 1.5 ? "crit" : sf < 3 ? "warn" : "good";
  const sfHint =
    sfTone === "good"
      ? t("dashboard.kpi.healthyHint")
      : sfTone === "warn"
        ? t("dashboard.kpi.warnHint")
        : t("dashboard.kpi.critHint");

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Metric
        label={t("dashboard.kpi.flightTime")}
        value={kpis ? formatFlightTime(kpis.flight_time_seconds) : "—"}
        icon={<Clock size={14} strokeWidth={1.75} />}
        tone="accent"
      />
      <Metric
        label={t("dashboard.kpi.missions")}
        value={kpis ? kpis.missions_completed.toLocaleString() : "—"}
        icon={<Trophy size={14} strokeWidth={1.75} />}
        tone="good"
      />
      <Metric
        label={t("dashboard.kpi.worstSf")}
        value={kpis ? sf.toFixed(2) : "—"}
        icon={<ShieldAlert size={14} strokeWidth={1.75} />}
        tone={sfTone}
        hint={sfHint}
      />
      <Metric
        label={t("dashboard.kpi.cycles")}
        value={kpis ? kpis.total_cycles.toLocaleString() : "—"}
        icon={<Activity size={14} strokeWidth={1.75} />}
      />
    </div>
  );
}
