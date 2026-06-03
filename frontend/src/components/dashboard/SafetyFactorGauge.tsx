import { ARM_LABEL_KEYS, SAFETY_FACTOR_THRESHOLD } from "@/utils/constants";
import {
  safetyFactorToHex,
  safetyFactorLabel,
} from "@/components/drone-viewer/thermal";
import { useT, type TranslationKey } from "@/i18n";

interface SafetyFactorGaugeProps {
  armIndex: number;
  value: number;
}

const STATUS_LABEL_KEYS: Record<string, TranslationKey> = {
  critical: "status.critical",
  warn: "status.warn",
  watch: "status.watch",
  healthy: "status.healthy",
  optimal: "status.optimal",
};

export function SafetyFactorGauge({ armIndex, value }: SafetyFactorGaugeProps) {
  const t = useT();
  const color = safetyFactorToHex(value);
  const status = safetyFactorLabel(value);
  const percentage = Math.min((value / (SAFETY_FACTOR_THRESHOLD * 4)) * 100, 100);

  return (
    <div className="surface p-4 lift">
      <div className="flex items-baseline justify-between mb-3">
        <span className="eyebrow">{t(ARM_LABEL_KEYS[armIndex])}</span>
        <span
          className="text-[9px] font-mono font-bold tracking-wider"
          style={{ color }}
        >
          {t(STATUS_LABEL_KEYS[status])}
        </span>
      </div>
      <div className="flex items-baseline justify-between mb-2">
        <span
          className="font-mono font-bold text-2xl tracking-tight"
          style={{ color }}
        >
          {value.toFixed(2)}
        </span>
        <span className="text-[10px] font-mono text-ink-500">{t("sf.short")}</span>
      </div>
      <div className="relative w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-white/20"
          style={{ left: `${(SAFETY_FACTOR_THRESHOLD / (SAFETY_FACTOR_THRESHOLD * 4)) * 100}%` }}
          title="Threshold"
        />
      </div>
    </div>
  );
}
