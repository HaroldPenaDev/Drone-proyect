import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TelemetryPoint } from "@/types";
import { ARM_LABEL_KEYS } from "@/utils/constants";
import { Surface } from "@/components/ui";
import { useT } from "@/i18n";

interface DegradationChartProps {
  data: TelemetryPoint[];
}

const ARM_COLORS = ["#22d3ee", "#10b981", "#f59e0b", "#ef4444"];

export function DegradationChart({ data }: DegradationChartProps) {
  const t = useT();
  const groupedByTime: Record<string, Record<string, number>> = {};

  data.forEach((point) => {
    const timeKey = new Date(point.timestamp).toLocaleTimeString();
    if (!groupedByTime[timeKey]) {
      groupedByTime[timeKey] = { time: timeKey } as unknown as Record<
        string,
        number
      >;
    }
    groupedByTime[timeKey][`arm_${point.arm_index}`] = Number(
      (point.degradation_factor * 100).toFixed(4),
    );
  });

  const chartData = Object.values(groupedByTime).slice(-60);

  return (
    <Surface padded>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-sm font-semibold text-white">
          {t("dashboard.section.degradation")}
        </h3>
        <span className="eyebrow">{t("dashboard.section.degradationHint")}</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <defs>
            {[0, 1, 2, 3].map((i) => (
              <linearGradient key={i} id={`grad-arm-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ARM_COLORS[i]} stopOpacity={0.4} />
                <stop offset="100%" stopColor={ARM_COLORS[i]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c2230" />
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#3a4254" }} />
          <YAxis
            tick={{ fontSize: 9, fill: "#3a4254" }}
            tickFormatter={(v: number) => `${v.toFixed(3)}%`}
            width={50}
          />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
          {[0, 1, 2, 3].map((armIndex) => (
            <Area
              key={armIndex}
              type="monotone"
              dataKey={`arm_${armIndex}`}
              name={t(ARM_LABEL_KEYS[armIndex])}
              stroke={ARM_COLORS[armIndex]}
              fill={`url(#grad-arm-${armIndex})`}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Surface>
  );
}
