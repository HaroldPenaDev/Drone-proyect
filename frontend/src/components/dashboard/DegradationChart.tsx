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
import { ARM_LABELS } from "@/utils/constants";

interface DegradationChartProps {
  data: TelemetryPoint[];
}

const ARM_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

export function DegradationChart({ data }: DegradationChartProps) {
  const groupedByTime: Record<string, Record<string, number>> = {};

  data.forEach((point) => {
    const timeKey = new Date(point.timestamp).toLocaleTimeString();
    if (!groupedByTime[timeKey]) {
      groupedByTime[timeKey] = { time: timeKey } as unknown as Record<string, number>;
    }
    groupedByTime[timeKey][`arm_${point.arm_index}`] = Number(
      (point.degradation_factor * 100).toFixed(2)
    );
  });

  const chartData = Object.values(groupedByTime).slice(-60);

  return (
    <div className="bg-drone-panel rounded-lg p-4 border border-drone-border">
      <h3 className="text-sm font-medium text-gray-300 mb-3">
        Material Degradation Over Time
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            label={{ value: "%", position: "insideLeft", fill: "#94a3b8" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
            }}
          />
          <Legend />
          {[0, 1, 2, 3].map((armIndex) => (
            <Area
              key={armIndex}
              type="monotone"
              dataKey={`arm_${armIndex}`}
              name={ARM_LABELS[armIndex]}
              stroke={ARM_COLORS[armIndex]}
              fill={ARM_COLORS[armIndex]}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
