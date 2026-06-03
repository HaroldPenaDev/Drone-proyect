import type { MissionAnalytics } from "@/types";
import { ARM_LABEL_KEYS } from "@/utils/constants";
import { useT } from "@/i18n";

interface PerArmHeatmapProps {
  missions: MissionAnalytics[];
}

const shortId = (id: string): string => id.slice(0, 8);

const colorForSafety = (sf: number): string => {
  if (sf <= 0) return "#1f2937";
  if (sf < 1.5) return "#dc2626";
  if (sf < 2.5) return "#f59e0b";
  if (sf < 4) return "#84cc16";
  return "#22c55e";
};

const colorForDegradation = (delta: number): string => {
  const pct = Math.min(delta * 100, 5);
  const intensity = Math.round((pct / 5) * 255);
  return `rgb(${intensity}, ${Math.round(intensity / 4)}, 0)`;
};

export function PerArmHeatmap({ missions }: PerArmHeatmapProps) {
  const t = useT();
  if (missions.length === 0) return null;

  return (
    <div className="surface p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-200">
          {t("analysis.heatmap.title")}
        </h3>
        <span className="text-[11px] text-gray-500">
          {t("analysis.heatmap.legend")}
        </span>
      </div>

      <div className="space-y-4">
        {missions.map((mission) => (
          <div key={mission.mission_id}>
            <div className="text-xs font-mono text-gray-400 mb-1.5">
              {shortId(mission.mission_id)}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ARM_LABEL_KEYS.map((labelKey, idx) => {
                const label = t(labelKey);
                const arm = mission.arms.find((a) => a.arm_index === idx);
                if (!arm) {
                  return (
                    <div
                      key={idx}
                      className="rounded p-2 bg-ink/40 border border-white/5 text-center"
                    >
                      <div className="text-[10px] text-gray-500">{label}</div>
                      <div className="text-xs text-gray-600 mt-1">—</div>
                    </div>
                  );
                }
                return (
                  <div
                    key={idx}
                    className="rounded p-2 border border-white/5 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${colorForSafety(
                        arm.min_safety_factor,
                      )}33 0%, ${colorForDegradation(
                        arm.degradation_delta,
                      )}33 100%)`,
                    }}
                  >
                    <div className="text-[10px] text-gray-300 font-medium">
                      {label}
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span
                        className="text-sm font-mono font-bold"
                        style={{ color: colorForSafety(arm.min_safety_factor) }}
                      >
                        SF {arm.min_safety_factor.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Δ {(arm.degradation_delta * 100).toFixed(3)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
