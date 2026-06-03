import type { MissionAnalytics } from "@/types";
import { useT, type TranslationKey } from "@/i18n";

interface RankingCardsProps {
  missions: MissionAnalytics[];
  colorMap: Record<string, string>;
}

interface MetricSpec {
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  pick: (m: MissionAnalytics) => number;
  better: "higher" | "lower";
  format: (v: number) => string;
}

const METRICS: MetricSpec[] = [
  {
    labelKey: "analysis.ranking.safest",
    descriptionKey: "analysis.ranking.safestDesc",
    pick: (m) => m.worst_safety_factor,
    better: "higher",
    format: (v) => v.toFixed(2),
  },
  {
    labelKey: "analysis.ranking.lowestWear",
    descriptionKey: "analysis.ranking.lowestWearDesc",
    pick: (m) => m.total_degradation_delta,
    better: "lower",
    format: (v) => `${(v * 100).toFixed(2)}%`,
  },
  {
    labelKey: "analysis.ranking.efficient",
    descriptionKey: "analysis.ranking.efficientDesc",
    pick: (m) => m.overall_avg_thrust,
    better: "lower",
    format: (v) => `${v.toFixed(2)} N`,
  },
  {
    labelKey: "analysis.ranking.longest",
    descriptionKey: "analysis.ranking.longestDesc",
    pick: (m) => m.duration_seconds,
    better: "higher",
    format: (v) => {
      if (v < 60) return `${v.toFixed(0)}s`;
      const m = Math.floor(v / 60);
      const s = Math.round(v % 60);
      return `${m}m ${s}s`;
    },
  },
];

const shortId = (id: string): string => id.slice(0, 8);

export function RankingCards({ missions, colorMap }: RankingCardsProps) {
  const t = useT();
  if (missions.length < 2) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {METRICS.map((metric) => {
        const valid = missions.filter(
          (m) => Number.isFinite(metric.pick(m)) && m.duration_seconds > 0,
        );
        if (valid.length === 0) return null;
        const winner = valid.reduce((best, m) => {
          if (metric.better === "higher") {
            return metric.pick(m) > metric.pick(best) ? m : best;
          }
          return metric.pick(m) < metric.pick(best) ? m : best;
        }, valid[0]);

        return (
          <div
            key={metric.labelKey}
            className="surface p-4 border border-white/5"
          >
            <div className="text-[11px] uppercase tracking-wider text-gray-500">
              {t(metric.labelKey)}
            </div>
            <div className="text-lg font-mono font-bold text-white mt-1">
              {metric.format(metric.pick(winner))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: colorMap[winner.mission_id] }}
              />
              <span className="text-xs text-gray-400 font-mono">
                {shortId(winner.mission_id)}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1.5">
              {t(metric.descriptionKey)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
