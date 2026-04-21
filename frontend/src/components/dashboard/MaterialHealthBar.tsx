import { ARM_LABELS } from "@/utils/constants";
import { formatPercentage } from "@/utils/formatters";

interface MaterialHealthBarProps {
  armIndex: number;
  degradation: number;
}

export function MaterialHealthBar({ armIndex, degradation }: MaterialHealthBarProps) {
  const health = 1.0 - degradation;
  const healthPercent = health * 100;

  const barColor =
    healthPercent > 75 ? "#22c55e" : healthPercent > 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="bg-drone-panel rounded-lg p-4 border border-drone-border">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-400">{ARM_LABELS[armIndex]}</span>
        <span className="text-sm font-mono" style={{ color: barColor }}>
          {formatPercentage(health)}
        </span>
      </div>
      <div className="w-full h-2 bg-drone-dark rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${healthPercent}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Degradación: {formatPercentage(degradation)}
      </div>
    </div>
  );
}
