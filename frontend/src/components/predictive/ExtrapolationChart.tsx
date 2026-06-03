import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ArmPrediction } from "@/types";
import { ARM_LABEL_KEYS } from "@/utils/constants";
import { useT } from "@/i18n";

interface ExtrapolationChartProps {
  predictions: ArmPrediction[];
}

const ARM_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

const CRITICAL_DEGRADATION_PERCENT = 99;

export function ExtrapolationChart({ predictions }: ExtrapolationChartProps) {
  const t = useT();
  const maxHours = Math.max(
    ...predictions.map((p) =>
      p.hours_until_critical !== null
        ? Math.min(p.hours_until_critical * 1.2, 24 * 30 * 6)
        : 24,
    ),
    24,
  );

  const data: Record<string, number>[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * maxHours;
    const row: Record<string, number> = { t };
    for (const p of predictions) {
      const projected =
        p.current_degradation + p.degradation_rate_per_hour * t;
      row[`arm_${p.arm_index}`] = Math.min(1.0, Math.max(0, projected)) * 100;
    }
    data.push(row);
  }

  return (
    <div className="bg-ink-100 rounded-lg border border-white/5 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-200">
          {t("predictive.chart.title")}
        </h3>
        <span className="text-[11px] text-gray-500">
          {t("predictive.chart.horizonLabel")}
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[0, maxHours]}
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => {
                if (v < 1) return `${(v * 60).toFixed(0)}m`;
                if (v < 48) return `${v.toFixed(0)}h`;
                return `${(v / 24).toFixed(0)}d`;
              }}
              label={{
                value: "tiempo desde ahora",
                position: "insideBottom",
                offset: -2,
                style: { fill: "#6b7280", fontSize: 10 },
              }}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              label={{
                value: "degradación",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#6b7280", fontSize: 11 },
              }}
            />
            <ReferenceLine
              y={CRITICAL_DEGRADATION_PERCENT}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{
                value: t("predictive.chart.criticalThreshold"),
                fill: "#ef4444",
                fontSize: 10,
                position: "right",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1f2937",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(v: number) => {
                if (v < 1) return `${(v * 60).toFixed(0)} min`;
                if (v < 48) return `${v.toFixed(1)} h`;
                return `${(v / 24).toFixed(1)} días`;
              }}
              formatter={(value: number) => `${value.toFixed(4)}%`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {predictions.map((p) => (
              <Line
                key={p.arm_index}
                type="monotone"
                dataKey={`arm_${p.arm_index}`}
                name={t(ARM_LABEL_KEYS[p.arm_index])}
                stroke={ARM_COLORS[p.arm_index]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
