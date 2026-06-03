import { useEffect, useState } from "react";
import { useDroneStore } from "@/stores/droneStore";
import { fetchPrediction } from "@/api/predictive";
import type { DronePrediction } from "@/types";
import { ArmPredictionCard } from "@/components/predictive/ArmPredictionCard";
import { ExtrapolationChart } from "@/components/predictive/ExtrapolationChart";
import { PageHeader, Surface } from "@/components/ui";
import { TrendingUp } from "lucide-react";
import { useT, useLangStore, type TranslationKey } from "@/i18n";

const OVERALL_META: Record<
  string,
  { labelKey: TranslationKey; color: string; bg: string }
> = {
  healthy: {
    labelKey: "status.healthy",
    color: "text-green-300",
    bg: "bg-green-950/30 border-green-900/60",
  },
  watch: {
    labelKey: "status.watch",
    color: "text-amber-300",
    bg: "bg-amber-950/30 border-amber-900/60",
  },
  critical: {
    labelKey: "status.critical",
    color: "text-red-300",
    bg: "bg-red-950/30 border-red-900/60",
  },
  stable: {
    labelKey: "status.stable",
    color: "text-gray-300",
    bg: "surface",
  },
};

const formatHours = (hours: number | null, lang: string): string => {
  if (hours === null) return "—";
  if (hours < 1) return `${(hours * 60).toFixed(0)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  const days = lang === "es" ? "días" : "days";
  return `${(hours / 24).toFixed(1)} ${days}`;
};

export function PredictivePage() {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const loadDrones = useDroneStore((s) => s.loadDrones);
  const [prediction, setPrediction] = useState<DronePrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    loadDrones();
  }, [loadDrones]);

  useEffect(() => {
    if (!selectedDrone) return;
    setLoading(true);
    setError(null);
    fetchPrediction(selectedDrone.id)
      .then(setPrediction)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error"),
      )
      .finally(() => setLoading(false));
  }, [selectedDrone]);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={t("predictive.eyebrow")}
        title={t("predictive.title")}
        description={t("predictive.description")}
      />

      {loading && (
        <Surface padded>
          <div className="text-center text-ink-500 text-sm py-4">
            {t("predictive.loading")}
          </div>
        </Surface>
      )}

      {error && (
        <Surface tone="crit" padded>
          <div className="text-sm text-crit">{error}</div>
        </Surface>
      )}

      {prediction && !loading && (
        <>
          <OverallSummary prediction={prediction} />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {prediction.arms.map((arm) => (
              <ArmPredictionCard key={arm.arm_index} prediction={arm} />
            ))}
          </div>

          <ExtrapolationChart predictions={prediction.arms} />

          <Surface padded>
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <TrendingUp size={16} className="text-accent" strokeWidth={1.75} />
              </div>
              <div className="text-xs text-ink-500 leading-relaxed">
                <span className="text-white font-display font-semibold">
                  {t("predictive.method.title")}
                </span>{" "}
                {t("predictive.method.body")}
              </div>
            </div>
          </Surface>
        </>
      )}
    </div>
  );
}

function OverallSummary({ prediction }: { prediction: DronePrediction }) {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const meta = OVERALL_META[prediction.overall_health] ?? OVERALL_META.stable;
  return (
    <div
      className={`${meta.bg} border rounded-lg p-5 grid grid-cols-1 md:grid-cols-4 gap-4`}
    >
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500">
          {t("predictive.overall")}
        </div>
        <div className={`text-2xl font-bold ${meta.color} mt-1`}>
          {t(meta.labelKey)}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500">
          {t("predictive.nextInspection")}
        </div>
        <div className="text-2xl font-mono font-bold text-white mt-1">
          {formatHours(prediction.next_inspection_recommended_hours, lang)}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500">
          {t("predictive.horizon")}
        </div>
        <div className="text-2xl font-mono font-bold text-gray-200 mt-1">
          {prediction.horizon_hours < 1
            ? `${(prediction.horizon_hours * 60).toFixed(0)} min`
            : `${prediction.horizon_hours.toFixed(1)} h`}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-gray-500">
          {t("predictive.samples")}
        </div>
        <div className="text-2xl font-mono font-bold text-gray-200 mt-1">
          {prediction.samples_analyzed.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
