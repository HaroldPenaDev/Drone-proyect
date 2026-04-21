import { getSafetyColor } from "@/utils/formatters";
import { ARM_LABELS, SAFETY_FACTOR_THRESHOLD } from "@/utils/constants";

interface SafetyFactorGaugeProps {
  armIndex: number;
  value: number;
}

export function SafetyFactorGauge({ armIndex, value }: SafetyFactorGaugeProps) {
  const color = getSafetyColor(value);
  const percentage = Math.min((value / (SAFETY_FACTOR_THRESHOLD * 3)) * 100, 100);

  return (
    <div className="bg-drone-panel rounded-lg p-4 border border-drone-border">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-400">{ARM_LABELS[armIndex]}</span>
        <span className="text-sm font-mono font-bold" style={{ color }}>
          {value.toFixed(2)}
        </span>
      </div>
      <div className="w-full h-2 bg-drone-dark rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Umbral: {SAFETY_FACTOR_THRESHOLD}
      </div>
    </div>
  );
}
