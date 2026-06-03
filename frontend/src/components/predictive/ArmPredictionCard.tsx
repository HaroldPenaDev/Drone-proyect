import type { ArmPrediction } from "@/types";
import { ARM_LABEL_KEYS } from "@/utils/constants";
import { useT, useLangStore, type TranslationKey } from "@/i18n";

interface ArmPredictionCardProps {
  prediction: ArmPrediction;
}

const STATUS_META: Record<
  string,
  { labelKey: TranslationKey; color: string; bg: string; border: string }
> = {
  healthy: {
    labelKey: "status.healthy",
    color: "text-green-300",
    bg: "bg-green-950/30",
    border: "border-green-900/60",
  },
  watch: {
    labelKey: "status.watch",
    color: "text-amber-300",
    bg: "bg-amber-950/30",
    border: "border-amber-900/60",
  },
  critical: {
    labelKey: "status.critical",
    color: "text-red-300",
    bg: "bg-red-950/30",
    border: "border-red-900/60",
  },
  stable: {
    labelKey: "status.stable",
    color: "text-gray-300",
    bg: "bg-ink-100",
    border: "border-white/5",
  },
};

const formatHours = (hours: number | null, lang: string): string => {
  if (hours === null) return "—";
  if (hours < 1) return `${(hours * 60).toFixed(0)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  const days = hours / 24;
  if (days < 30) return `${days.toFixed(1)} ${lang === "es" ? "días" : "days"}`;
  return `${(days / 30).toFixed(1)} ${lang === "es" ? "meses" : "months"}`;
};

export function ArmPredictionCard({ prediction }: ArmPredictionCardProps) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const meta = STATUS_META[prediction.health_status] ?? STATUS_META.stable;
  const armName = ARM_LABEL_KEYS[prediction.arm_index]
    ? t(ARM_LABEL_KEYS[prediction.arm_index])
    : `Arm ${prediction.arm_index}`;

  return (
    <div className={`${meta.bg} ${meta.border} border rounded-lg p-4 space-y-3`}>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">
            {armName}
          </div>
          <div className={`text-sm font-semibold ${meta.color} mt-0.5`}>
            {t(meta.labelKey)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
            {t("predictive.arm.timeRemaining")}
          </div>
          <div className="text-xl font-mono font-bold text-white">
            {formatHours(prediction.hours_until_critical, lang)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-gray-500">{t("predictive.arm.currentSf")}</div>
          <div
            className={`font-mono font-semibold ${
              prediction.current_safety_factor < 1.5
                ? "text-red-400"
                : prediction.current_safety_factor < 3
                  ? "text-amber-400"
                  : "text-green-400"
            }`}
          >
            {prediction.current_safety_factor.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">{t("predictive.arm.degradation")}</div>
          <div className="font-mono text-gray-200">
            {(prediction.current_degradation * 100).toFixed(4)}%
          </div>
        </div>
        <div>
          <div className="text-gray-500">{t("predictive.arm.rate")}</div>
          <div className="font-mono text-gray-200">
            {(prediction.degradation_rate_per_hour * 100).toExponential(2)}/h
          </div>
        </div>
        <div>
          <div className="text-gray-500">{t("predictive.arm.confidence")}</div>
          <div className="font-mono text-gray-200">
            R² {prediction.confidence.toFixed(2)}
          </div>
        </div>
      </div>

      {prediction.cycles_until_critical !== null &&
        prediction.cycles_until_critical > 0 && (
          <div className="text-[11px] text-gray-400 border-t border-white/[0.06] pt-2">
            ≈{" "}
            <span className="text-gray-200 font-mono">
              {prediction.cycles_until_critical.toLocaleString()}
            </span>{" "}
            {t("predictive.arm.cyclesUntil")}
          </div>
        )}
    </div>
  );
}
