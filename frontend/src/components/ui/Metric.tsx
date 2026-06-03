import type { ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";

interface MetricProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  tone?: "default" | "good" | "warn" | "crit" | "accent";
  icon?: ReactNode;
  trend?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE: Record<NonNullable<MetricProps["size"]>, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
};

const TONE_VALUE_COLOR = {
  default: "text-white",
  good: "text-good",
  warn: "text-warn",
  crit: "text-crit",
  accent: "text-accent",
};

export function Metric({
  label,
  value,
  unit,
  hint,
  tone = "default",
  icon,
  trend,
  size = "md",
}: MetricProps) {
  return (
    <Surface tone={tone === "default" ? "default" : tone} padded>
      <div className="flex items-start justify-between mb-2">
        <span className="eyebrow">{label}</span>
        {icon && <span className="text-ink-500">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`font-mono font-bold tracking-tight ${SIZE[size]} ${TONE_VALUE_COLOR[tone]}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-ink-500 text-sm font-mono">{unit}</span>
        )}
      </div>
      {(hint || trend) && (
        <div className="flex items-center justify-between mt-2 text-[11px]">
          {hint && <span className="text-ink-500">{hint}</span>}
          {trend && <span>{trend}</span>}
        </div>
      )}
    </Surface>
  );
}
