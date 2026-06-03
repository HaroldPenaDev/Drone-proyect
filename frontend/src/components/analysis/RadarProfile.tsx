import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { MissionAnalytics } from "@/types";
import { useT, type TranslationKey } from "@/i18n";

interface RadarProfileProps {
  missions: MissionAnalytics[];
  colorMap: Record<string, string>;
}

const shortId = (id: string): string => id.slice(0, 8);

const AXES: { key: string; labelKey: TranslationKey }[] = [
  { key: "thrust", labelKey: "analysis.radar.thrust" },
  { key: "torque", labelKey: "analysis.radar.torque" },
  { key: "stress", labelKey: "analysis.radar.stress" },
  { key: "wear", labelKey: "analysis.radar.wear" },
  { key: "duration", labelKey: "analysis.radar.duration" },
];

export function RadarProfile({ missions, colorMap }: RadarProfileProps) {
  const t = useT();
  if (missions.length === 0) return null;

  const maxThrust = Math.max(...missions.map((m) => m.overall_peak_thrust), 1);
  const maxTorque = Math.max(
    ...missions.flatMap((m) => m.arms.map((a) => a.max_torque)),
    0.1,
  );
  const maxStress = Math.max(
    ...missions.map((m) =>
      m.worst_safety_factor > 0 ? 1 / m.worst_safety_factor : 0,
    ),
    0.5,
  );
  const maxWear = Math.max(
    ...missions.map((m) => m.total_degradation_delta),
    0.001,
  );
  const maxDuration = Math.max(...missions.map((m) => m.duration_seconds), 1);

  const data = AXES.map((axis) => {
    const row: Record<string, string | number> = { axis: t(axis.labelKey) };
    for (const m of missions) {
      let normalized = 0;
      if (axis.key === "thrust") {
        normalized = (m.overall_avg_thrust / maxThrust) * 100;
      } else if (axis.key === "torque") {
        const avgTorque =
          m.arms.length > 0
            ? m.arms.reduce((s, a) => s + a.avg_torque, 0) / m.arms.length
            : 0;
        normalized = (avgTorque / maxTorque) * 100;
      } else if (axis.key === "stress") {
        const stress = m.worst_safety_factor > 0 ? 1 / m.worst_safety_factor : 0;
        normalized = (stress / maxStress) * 100;
      } else if (axis.key === "wear") {
        normalized = (m.total_degradation_delta / maxWear) * 100;
      } else if (axis.key === "duration") {
        normalized = (m.duration_seconds / maxDuration) * 100;
      }
      row[m.mission_id] = Math.round(normalized);
    }
    return row;
  });

  return (
    <div className="surface p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-200">
          {t("analysis.radar.title")}
        </h3>
        <span className="text-[11px] text-gray-500">
          {t("analysis.radar.normalized")}
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#1f2937" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#4b5563", fontSize: 10 }}
              stroke="#1f2937"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1f2937",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                `${value}`,
                shortId(name),
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value: string) => shortId(value)}
            />
            {missions.map((m) => (
              <Radar
                key={m.mission_id}
                name={m.mission_id}
                dataKey={m.mission_id}
                stroke={colorMap[m.mission_id]}
                fill={colorMap[m.mission_id]}
                fillOpacity={0.18}
                isAnimationActive={false}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
