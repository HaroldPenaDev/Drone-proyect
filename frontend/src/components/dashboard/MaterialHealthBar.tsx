import { ARM_LABEL_KEYS } from "@/utils/constants";
import { formatPercentage } from "@/utils/formatters";
import { useT } from "@/i18n";

interface MaterialHealthBarProps {
  armIndex: number;
  degradation: number;
}

export function MaterialHealthBar({
  armIndex,
  degradation,
}: MaterialHealthBarProps) {
  const t = useT();
  const health = 1.0 - degradation;
  const healthPercent = health * 100;

  const color =
    healthPercent > 75
      ? "#10b981"
      : healthPercent > 40
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="surface p-4 lift">
      <div className="flex items-baseline justify-between mb-3">
        <span className="eyebrow">{t(ARM_LABEL_KEYS[armIndex])}</span>
        <span
          className="font-mono text-sm font-semibold"
          style={{ color }}
        >
          {formatPercentage(health)}
        </span>
      </div>
      <div className="relative w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${healthPercent}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
      <div className="text-[10px] text-ink-500 font-mono mt-2">
        {t("material.degradation")}: {formatPercentage(degradation)}
      </div>
    </div>
  );
}
