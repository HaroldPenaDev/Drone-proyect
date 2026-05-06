import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TelemetryPoint } from "@/types";

interface ThrustTorqueChartProps {
  data: TelemetryPoint[];
  armIndex: number;
}

export function ThrustTorqueChart({ data, armIndex }: ThrustTorqueChartProps) {
  const filtered = data
    .filter((p) => p.arm_index === armIndex)
    .slice(-60)
    .map((p) => ({
      time: new Date(p.timestamp).toLocaleTimeString(),
      thrust: Number(p.thrust.toFixed(3)),
      torque: Number(p.torque.toFixed(4)),
    }));

  return (
    <div className="bg-drone-panel rounded-lg p-4 border border-drone-border">
      <h3 className="text-sm font-medium text-gray-300 mb-3">
        Thrust / Torque - Arm {armIndex}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={filtered}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis yAxisId="thrust" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <YAxis yAxisId="torque" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} />
          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
          <Legend />
          <Line yAxisId="thrust" type="monotone" dataKey="thrust" stroke="#3b82f6" dot={false} strokeWidth={2} />
          <Line yAxisId="torque" type="monotone" dataKey="torque" stroke="#f59e0b" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
