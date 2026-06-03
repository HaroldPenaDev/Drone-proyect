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
import { ARM_LABEL_KEYS } from "@/utils/constants";
import { Surface } from "@/components/ui";
import { useT } from "@/i18n";

interface ThrustTorqueChartProps {
  data: TelemetryPoint[];
  armIndex: number;
}

export function ThrustTorqueChart({ data, armIndex }: ThrustTorqueChartProps) {
  const t = useT();
  const filtered = data
    .filter((p) => p.arm_index === armIndex)
    .slice(-60)
    .map((p) => ({
      time: new Date(p.timestamp).toLocaleTimeString(),
      thrust: Number(p.thrust.toFixed(3)),
      torque: Number(p.torque.toFixed(4)),
    }));

  return (
    <Surface padded>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-sm font-semibold text-white">
          {ARM_LABEL_KEYS[armIndex] ? t(ARM_LABEL_KEYS[armIndex]) : `Arm ${armIndex}`}
        </h3>
        <span className="eyebrow">{t("dashboard.section.motorsHint")}</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={filtered} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c2230" />
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#3a4254" }} />
          <YAxis
            yAxisId="thrust"
            tick={{ fontSize: 9, fill: "#3a4254" }}
            width={32}
          />
          <YAxis
            yAxisId="torque"
            orientation="right"
            tick={{ fontSize: 9, fill: "#3a4254" }}
            width={32}
          />
          <Tooltip />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
            iconType="line"
          />
          <Line
            yAxisId="thrust"
            type="monotone"
            dataKey="thrust"
            name="Empuje (N)"
            stroke="#22d3ee"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Line
            yAxisId="torque"
            type="monotone"
            dataKey="torque"
            name="Torque (Nm)"
            stroke="#f59e0b"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Surface>
  );
}
