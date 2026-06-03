import { SafetyFactorGauge } from "@/components/dashboard/SafetyFactorGauge";
import { MaterialHealthBar } from "@/components/dashboard/MaterialHealthBar";
import { ThrustTorqueChart } from "@/components/dashboard/ThrustTorqueChart";
import type { DroneSnapshot, TelemetryPoint } from "@/types";
import { useT } from "@/i18n";

interface TelemetryPanelProps {
  snapshot: DroneSnapshot | null;
  history: TelemetryPoint[];
}

export function TelemetryPanel({ snapshot, history }: TelemetryPanelProps) {
  const t = useT();

  if (!snapshot) {
    return (
      <div className="surface px-6 py-12 text-center">
        <div className="text-ink-500 text-sm font-display">
          {t("common.waitingTelemetry")}
        </div>
        <div className="text-ink-500/60 text-[11px] font-mono mt-1">
          {t("common.startMission")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-baseline justify-between mb-2.5">
          <h3 className="section-title">{t("dashboard.section.safety")}</h3>
          <span className="eyebrow">{t("dashboard.section.safetyHint")}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {snapshot.arms.map((arm) => (
            <SafetyFactorGauge
              key={arm.arm_index}
              armIndex={arm.arm_index}
              value={arm.safety_factor}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2.5">
          <h3 className="section-title">{t("dashboard.section.material")}</h3>
          <span className="eyebrow">{t("dashboard.section.materialHint")}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {snapshot.arms.map((arm) => (
            <MaterialHealthBar
              key={arm.arm_index}
              armIndex={arm.arm_index}
              degradation={arm.degradation_factor}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2.5">
          <h3 className="section-title">{t("dashboard.section.motors")}</h3>
          <span className="eyebrow">{t("dashboard.section.motorsHint")}</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {snapshot.arms.slice(0, 2).map((arm) => (
            <ThrustTorqueChart
              key={arm.arm_index}
              data={history}
              armIndex={arm.arm_index}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
