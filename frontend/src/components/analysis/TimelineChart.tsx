import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MissionAnalytics } from "@/types";
import { useT } from "@/i18n";

type Metric = "avg_thrust" | "min_safety_factor" | "max_degradation";

interface TimelineChartProps {
  missions: MissionAnalytics[];
  metric: Metric;
  title: string;
  yLabel: string;
  colorMap: Record<string, string>;
  formatY?: (v: number) => string;
}

const shortId = (id: string): string => id.slice(0, 8);

const buildMergedData = (missions: MissionAnalytics[], metric: Metric) => {
  const buckets = new Map<number, Record<string, number>>();
  for (const mission of missions) {
    for (const sample of mission.timeseries) {
      const t = Math.round(sample.t_seconds);
      const bucket = buckets.get(t) ?? { t };
      bucket[mission.mission_id] = sample[metric];
      buckets.set(t, bucket);
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.t - b.t);
};

export function TimelineChart({
  missions,
  metric,
  title,
  yLabel,
  colorMap,
  formatY,
}: TimelineChartProps) {
  const t = useT();
  const data = buildMergedData(missions, metric);
  const hasData = data.length > 0;

  return (
    <div className="surface p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        <span className="text-[11px] text-gray-500">
          {t("analysis.charts.timeAxis")}
        </span>
      </div>
      <div className="h-64">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            {t("common.noData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
                stroke="#6b7280"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}s`}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fontSize: 11 }}
                tickFormatter={formatY}
                label={{
                  value: yLabel,
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#6b7280", fontSize: 11 },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1f2937",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelFormatter={(v) => `t = ${v}s`}
                formatter={(value: number, name: string) => [
                  formatY ? formatY(value) : value.toFixed(3),
                  shortId(name),
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => shortId(value)}
              />
              {missions.map((m) => (
                <Line
                  key={m.mission_id}
                  type="monotone"
                  dataKey={m.mission_id}
                  stroke={colorMap[m.mission_id]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
