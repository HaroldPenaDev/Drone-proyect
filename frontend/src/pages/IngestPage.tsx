import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDroneStore } from "@/stores/droneStore";
import { templateUrl, uploadFlightCsv } from "@/api/ingest";
import type { IngestSummary } from "@/types";
import { PageHeader, Surface, Button } from "@/components/ui";
import { useT } from "@/i18n";
import { ARM_LABEL_KEYS } from "@/utils/constants";

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

export function IngestPage() {
  const drones = useDroneStore((s) => s.drones);
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const loadDrones = useDroneStore((s) => s.loadDrones);
  const t = useT();

  const [droneId, setDroneId] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<IngestSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDrones();
  }, [loadDrones]);

  useEffect(() => {
    if (selectedDrone && !droneId) setDroneId(selectedDrone.id);
  }, [selectedDrone, droneId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !droneId) {
      setError(t("ingest.error.noFile"));
      return;
    }
    setError(null);
    setSummary(null);
    setUploading(true);
    try {
      const result = await uploadFlightCsv(droneId, file, label.trim() || null);
      setSummary(result);
      setFile(null);
      setLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? (err instanceof Error ? err.message : "Error");
      setError(String(detail));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={t("ingest.eyebrow")}
        title={t("ingest.title")}
        description={t("ingest.description")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Surface padded>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                    {t("ingest.targetDrone")}
                  </label>
                  <select
                    value={droneId}
                    onChange={(e) => setDroneId(e.target.value)}
                    className="w-full bg-ink-50 border border-white/[0.06] hover:border-white/15 transition-colors rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/40"
                    required
                  >
                    <option value="" disabled>
                      {t("common.noDrones")}…
                    </option>
                    {drones.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                    {t("ingest.label")}
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={t("ingest.labelPlaceholder")}
                    className="w-full bg-ink-50 border border-white/[0.06] hover:border-white/15 transition-colors rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/40"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                    {t("ingest.file")}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-accent file:text-ink-50 hover:file:bg-accent/80 file:cursor-pointer"
                    required
                  />
                  {file && (
                    <div className="text-xs text-gray-400 mt-1.5">
                      {file.name}{" "}
                      <span className="text-gray-600">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="surface surface-crit p-3 text-sm text-crit">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={uploading || !file || !droneId}
                  >
                    {uploading ? t("ingest.uploadingBtn") : t("ingest.uploadBtn")}
                  </Button>
                  <a
                    href={templateUrl()}
                    download="flight_template.csv"
                    className="text-xs text-accent hover:underline"
                  >
                    {t("ingest.template")}
                  </a>
                </div>
              </div>
            </Surface>
          </form>
        </div>

        <div className="space-y-4">
          <Surface padded>
            <h3 className="text-sm font-semibold text-gray-200 mb-2">
              {t("ingest.format.title")}
            </h3>
            <p className="text-xs text-gray-400 mb-2">
              {t("ingest.format.detection")}
            </p>
            <div className="space-y-2 text-[11px]">
              <div>
                <div className="text-gray-300 font-semibold mb-0.5">
                  {t("ingest.format.wide")}
                </div>
                <code className="block bg-ink-50 p-2 rounded text-gray-400 font-mono leading-relaxed">
                  timestamp,thrust_0,thrust_1,
                  <br />
                  thrust_2,thrust_3,altitude,
                  <br />
                  roll,pitch,yaw
                </code>
              </div>
              <div>
                <div className="text-gray-300 font-semibold mb-0.5 mt-2">
                  {t("ingest.format.long")}
                </div>
                <code className="block bg-ink-50 p-2 rounded text-gray-400 font-mono leading-relaxed">
                  timestamp,arm_index,thrust,
                  <br />
                  torque,altitude,roll,pitch,yaw
                </code>
              </div>
            </div>
            <ul className="text-[11px] text-gray-500 mt-3 space-y-1 list-disc list-inside">
              <li>{t("ingest.format.tip1")}</li>
              <li>{t("ingest.format.tip2")}</li>
              <li>{t("ingest.format.tip3")}</li>
            </ul>
          </Surface>

          <Surface tone="accent" padded>
            <p className="text-xs text-accent leading-relaxed">
              {t("ingest.physics.note")}
            </p>
          </Surface>
        </div>
      </div>

      {summary && (
        <Surface tone="good" padded>
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-sm font-semibold text-good">
              {t("ingest.success")}
            </h3>
            <Link
              to="/analysis"
              className="text-xs text-accent hover:underline"
            >
              {t("ingest.success.goAnalysis")}
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryStat
              label={t("ingest.summary.rows")}
              value={summary.rows_parsed.toLocaleString()}
            />
            <SummaryStat
              label={t("ingest.summary.points")}
              value={summary.samples_written.toLocaleString()}
            />
            <SummaryStat
              label={t("ingest.summary.duration")}
              value={formatDuration(summary.duration_seconds)}
            />
            <SummaryStat
              label={t("ingest.summary.worstSf")}
              value={summary.worst_safety_factor.toFixed(2)}
              highlight={
                summary.worst_safety_factor < 1.5
                  ? "text-red-400"
                  : summary.worst_safety_factor < 3
                    ? "text-amber-400"
                    : "text-green-400"
              }
            />
          </div>

          <div className="mt-4">
            <div className="text-xs text-gray-400 mb-2">
              {t("ingest.summary.degradation")}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {summary.final_degradation_per_arm.map((deg, i) => (
                <div key={i} className="bg-ink-50 rounded p-2 border border-white/5">
                  <div className="text-[10px] text-gray-500">
                    {t(ARM_LABEL_KEYS[i])}
                  </div>
                  <div className="text-sm font-mono text-gray-200 mt-0.5">
                    {(deg * 100).toFixed(4)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-gray-500 font-mono mt-4">
            Mission ID: {summary.mission_id} · {summary.detected_format}
          </div>

          {summary.warnings.length > 0 && (
            <div className="border-t border-good/20 pt-3 mt-3">
              <div className="text-xs text-amber-300 font-semibold mb-1">
                {t("ingest.summary.warnings")} ({summary.warnings.length})
              </div>
              <ul className="text-[11px] text-amber-200/80 space-y-0.5 max-h-32 overflow-y-auto">
                {summary.warnings.map((w, i) => (
                  <li key={i} className="font-mono">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Surface>
      )}
    </div>
  );
}

interface SummaryStatProps {
  label: string;
  value: string;
  highlight?: string;
}

function SummaryStat({ label, value, highlight }: SummaryStatProps) {
  return (
    <div className="bg-ink-50 rounded p-3 border border-white/5">
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
