import { useEffect, useState } from "react";
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
import { useDroneStore } from "@/stores/droneStore";
import {
  compareRealVsSim,
  fetchValidationCandidates,
  suggestValidationPair,
} from "@/api/validation";
import type {
  Mission,
  ValidationCandidates,
  ValidationResponse,
} from "@/types";
import { PageHeader, Surface, Button } from "@/components/ui";
import { useT, type TranslationKey } from "@/i18n";

const REAL_COLOR = "#22d3ee";
const SIM_COLOR = "#f59e0b";

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

const shortId = (id: string): string => id.slice(0, 8);

const verdictKey = (score: number): TranslationKey => {
  if (score >= 85) return "validation.verdict.excellent";
  if (score >= 70) return "validation.verdict.good";
  if (score >= 50) return "validation.verdict.fair";
  return "validation.verdict.low";
};

export function ValidationPage() {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const loadDrones = useDroneStore((s) => s.loadDrones);
  const t = useT();

  const [candidates, setCandidates] = useState<ValidationCandidates | null>(null);
  const [realId, setRealId] = useState<string>("");
  const [simId, setSimId] = useState<string>("");
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDrones();
  }, [loadDrones]);

  useEffect(() => {
    if (!selectedDrone) return;
    fetchValidationCandidates(selectedDrone.id)
      .then(setCandidates)
      .catch(() => setCandidates({ real: [], sim: [] }));
  }, [selectedDrone]);

  useEffect(() => {
    if (!realId) return;
    suggestValidationPair(realId)
      .then((pair) => {
        if (pair) setSimId(pair.sim_mission_id);
      })
      .catch(() => {});
  }, [realId]);

  const runValidation = async () => {
    if (!realId || !simId) return;
    setLoading(true);
    setError(null);
    setValidation(null);
    try {
      const result = await compareRealVsSim(realId, simId);
      setValidation(result);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? (err instanceof Error ? err.message : "Error");
      setError(String(detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={t("validation.eyebrow")}
        title={t("validation.title")}
        description={t("validation.description")}
      />

      <Surface padded>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <MissionDropdown
            label={t("validation.real")}
            missions={candidates?.real ?? []}
            value={realId}
            onChange={setRealId}
            emptyHint={t("validation.real.empty")}
          />
          <MissionDropdown
            label={t("validation.sim")}
            missions={candidates?.sim ?? []}
            value={simId}
            onChange={setSimId}
            emptyHint={t("validation.sim.empty")}
          />
        </div>
        <Button
          variant="primary"
          onClick={runValidation}
          disabled={!realId || !simId || loading}
        >
          {loading ? t("validation.runBtn") : t("common.compare")}
        </Button>
      </Surface>

      {error && (
        <Surface tone="crit" padded>
          <div className="text-sm text-crit">{error}</div>
        </Surface>
      )}

      {validation && <ValidationResults result={validation} />}
    </div>
  );
}

interface DropdownProps {
  label: string;
  missions: Mission[];
  value: string;
  onChange: (v: string) => void;
  emptyHint: string;
}

function MissionDropdown({
  label,
  missions,
  value,
  onChange,
  emptyHint,
}: DropdownProps) {
  const t = useT();
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
        {label}
      </label>
      {missions.length === 0 ? (
        <div className="text-xs text-gray-500 italic py-2">{emptyHint}</div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-ink-50 border border-white/5 rounded px-3 py-2 text-sm text-white"
        >
          <option value="">{t("validation.dropdownPlaceholder")}</option>
          {missions.map((m) => (
            <option key={m.id} value={m.id}>
              {shortId(m.id)} · {m.movements.slice(0, 3).join("→")}
              {m.movements.length > 3 ? "…" : ""} ·{" "}
              {m.started_at
                ? new Date(m.started_at).toLocaleDateString()
                : "?"}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function ValidationResults({ result }: { result: ValidationResponse }) {
  const t = useT();
  const { deltas } = result;
  const scoreColor =
    deltas.overall_score >= 85
      ? "text-green-300"
      : deltas.overall_score >= 70
        ? "text-blue-300"
        : deltas.overall_score >= 50
          ? "text-amber-300"
          : "text-red-300";
  const scoreBg =
    deltas.overall_score >= 85
      ? "bg-green-950/30 border-green-900/60"
      : deltas.overall_score >= 70
        ? "bg-blue-950/30 border-blue-900/60"
        : deltas.overall_score >= 50
          ? "bg-amber-950/30 border-amber-900/60"
          : "bg-red-950/30 border-red-900/60";

  return (
    <div className="space-y-4">
      <div className={`${scoreBg} border rounded-lg p-5`}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400">
              {t("validation.score.label")}
            </div>
            <div className={`text-4xl font-bold ${scoreColor} mt-1`}>
              {deltas.overall_score.toFixed(1)}
              <span className="text-lg text-gray-500 ml-1">/100</span>
            </div>
          </div>
          <div className="text-right text-xs text-gray-400 max-w-md">
            {t(verdictKey(deltas.overall_score))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <DeltaCard
          label={t("validation.delta.thrustRmse")}
          value={`${deltas.thrust_rmse.toFixed(3)} N`}
        />
        <DeltaCard
          label={t("validation.delta.thrustMae")}
          value={`${deltas.thrust_mae.toFixed(3)} N`}
        />
        <DeltaCard
          label={t("validation.delta.thrustCorr")}
          value={deltas.thrust_correlation.toFixed(3)}
          highlight={
            deltas.thrust_correlation > 0.8
              ? "text-green-400"
              : deltas.thrust_correlation > 0.5
                ? "text-amber-400"
                : "text-red-400"
          }
        />
        <DeltaCard
          label={t("validation.delta.sfRmse")}
          value={deltas.safety_factor_rmse.toFixed(3)}
        />
        <DeltaCard
          label={t("validation.delta.sfMae")}
          value={deltas.safety_factor_mae.toFixed(3)}
        />
        <DeltaCard
          label={t("validation.delta.degMae")}
          value={`${(deltas.degradation_mae * 100).toExponential(2)}%`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <OverlayChart
          title={t("validation.chart.thrust")}
          unit="N"
          samples={result.samples}
          realKey="real_thrust"
          simKey="sim_thrust"
        />
        <OverlayChart
          title={t("validation.chart.sf")}
          unit=""
          samples={result.samples}
          realKey="real_safety_factor"
          simKey="sim_safety_factor"
        />
      </div>

      <OverlayChart
        title={t("validation.chart.deg")}
        unit="%"
        samples={result.samples}
        realKey="real_degradation"
        simKey="sim_degradation"
        scale={100}
      />

      <div className="text-[11px] text-gray-500 font-mono surface p-3">
        {t("validation.legend.real")}: {shortId(result.real_mission_id)} ·{" "}
        {formatDuration(result.real_duration_seconds)} |{" "}
        {t("validation.legend.sim")}: {shortId(result.sim_mission_id)} ·{" "}
        {formatDuration(result.sim_duration_seconds)}
      </div>
    </div>
  );
}

function DeltaCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: string;
}) {
  return (
    <div className="surface p-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div
        className={`text-lg font-mono font-bold mt-1 ${highlight ?? "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}

interface OverlayChartProps {
  title: string;
  unit: string;
  samples: ValidationResponse["samples"];
  realKey: keyof ValidationResponse["samples"][number];
  simKey: keyof ValidationResponse["samples"][number];
  scale?: number;
}

function OverlayChart({
  title,
  unit,
  samples,
  realKey,
  simKey,
  scale = 1,
}: OverlayChartProps) {
  const t = useT();
  const data = samples.map((s) => ({
    t: s.t_seconds,
    real: s[realKey] !== null ? (s[realKey] as number) * scale : null,
    sim: s[simKey] !== null ? (s[simKey] as number) * scale : null,
  }));

  return (
    <div className="surface p-4">
      <h3 className="text-sm font-semibold text-gray-200 mb-2">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${v.toFixed(0)}s`}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${v.toFixed(2)}${unit}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1f2937",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value: number) =>
                value !== null ? `${value.toFixed(3)}${unit}` : "—"
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="real"
              name={t("validation.legend.real")}
              stroke={REAL_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="sim"
              name={t("validation.legend.sim")}
              stroke={SIM_COLOR}
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
