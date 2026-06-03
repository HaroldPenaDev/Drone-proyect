import type { MissionAnalytics } from "@/types";
import { useT, type TranslationKey } from "@/i18n";

interface MetricsTableProps {
  missions: MissionAnalytics[];
  colorMap: Record<string, string>;
}

const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return "—";
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

interface Row {
  labelKey: TranslationKey;
  format: (m: MissionAnalytics) => string;
  highlight?: (m: MissionAnalytics) => string | undefined;
}

const ROWS: Row[] = [
  { labelKey: "analysis.metrics.duration", format: (m) => formatDuration(m.duration_seconds) },
  { labelKey: "analysis.metrics.dataPoints", format: (m) => m.data_points.toLocaleString() },
  { labelKey: "analysis.metrics.movements", format: (m) => m.movements.length.toString() },
  {
    labelKey: "analysis.metrics.avgThrust",
    format: (m) => `${m.overall_avg_thrust.toFixed(2)} N`,
  },
  {
    labelKey: "analysis.metrics.peakThrust",
    format: (m) => `${m.overall_peak_thrust.toFixed(2)} N`,
  },
  {
    labelKey: "analysis.metrics.minSf",
    format: (m) => m.worst_safety_factor.toFixed(2),
    highlight: (m) =>
      m.worst_safety_factor > 0 && m.worst_safety_factor < 1.5
        ? "text-red-400"
        : m.worst_safety_factor < 3
          ? "text-amber-400"
          : "text-green-400",
  },
  {
    labelKey: "analysis.metrics.avgSf",
    format: (m) => m.avg_safety_factor.toFixed(2),
  },
  {
    labelKey: "analysis.metrics.totalDeg",
    format: (m) => `${(m.total_degradation_delta * 100).toFixed(3)}%`,
    highlight: (m) =>
      m.total_degradation_delta > 0.01
        ? "text-red-400"
        : m.total_degradation_delta > 0.005
          ? "text-amber-400"
          : "text-gray-200",
  },
];

const shortId = (id: string): string => id.slice(0, 8);

export function MetricsTable({ missions, colorMap }: MetricsTableProps) {
  const t = useT();
  return (
    <div className="surface overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-gray-200">{t("analysis.metrics.title")}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink/60">
            <tr>
              <th className="text-left px-4 py-2 text-xs uppercase tracking-wider text-gray-500 font-medium">
                {t("analysis.metrics.title")}
              </th>
              {missions.map((m) => (
                <th
                  key={m.mission_id}
                  className="text-right px-4 py-2 text-xs font-mono text-gray-300"
                >
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: colorMap[m.mission_id] }}
                    />
                    {shortId(m.mission_id)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.labelKey} className="border-t border-white/5">
                <td className="px-4 py-2 text-gray-400 text-xs">{t(row.labelKey)}</td>
                {missions.map((m) => (
                  <td
                    key={m.mission_id}
                    className={`px-4 py-2 text-right font-mono text-sm ${
                      row.highlight?.(m) ?? "text-gray-200"
                    }`}
                  >
                    {row.format(m)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
