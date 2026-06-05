import { useMemo, useState } from "react";
import { Circle, Square, Download, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Surface, Button, Badge } from "@/components/ui";
import { useDroneStore } from "@/stores/droneStore";
import { usePilotStore } from "@/pilot/pilotStore";
import { flightRecorder, buildHumanCSV, buildIngestCSV } from "@/pilot/recorder";
import { uploadFlightCsv } from "@/api/ingest";
import { useT } from "@/i18n";

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function PilotRecorderPanel() {
  const t = useT();
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const recording = usePilotStore((s) => s.recording);
  const recElapsed = usePilotStore((s) => s.recElapsed);
  const recCount = usePilotStore((s) => s.recCount);
  const lastFlight = usePilotStore((s) => s.lastFlight);
  const setRecording = usePilotStore((s) => s.setRecording);
  const setLastFlight = usePilotStore((s) => s.setLastFlight);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const start = () => {
    flightRecorder.start();
    setLastFlight(null);
    setSaveState("idle");
    setRecording(true);
  };
  const stop = () => {
    flightRecorder.stop();
    setRecording(false);
    setLastFlight([...flightRecorder.samples]);
  };

  const chartData = useMemo(
    () =>
      (lastFlight ?? []).map((s) => ({
        t: Number(s.t.toFixed(1)),
        alt: Number(s.altitude.toFixed(2)),
        sf: Number(Math.min(s.worstSf, 10).toFixed(2)),
      })),
    [lastFlight],
  );

  const handleDownload = () => {
    if (!lastFlight?.length) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadText(`pilotaje-${stamp}.csv`, buildHumanCSV(lastFlight));
  };

  const handleSave = async () => {
    if (!lastFlight?.length || !selectedDrone) return;
    setSaveState("saving");
    try {
      const duration = lastFlight[lastFlight.length - 1].t;
      const baseEpoch = Date.now() / 1000 - duration;
      const csv = buildIngestCSV(lastFlight, baseEpoch);
      const file = new File([csv], "pilotaje.csv", { type: "text/csv" });
      const label = `Pilotaje ${new Date().toLocaleString()}`;
      await uploadFlightCsv(selectedDrone.id, file, label);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <Surface padded>
      {/* Barra de controles */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="eyebrow-accent">{t("pilot.rec.title")}</span>
          {recording && (
            <Badge tone="crit" pulse>
              {t("pilot.rec.recording")} {fmtTime(recElapsed)} · {recCount}
            </Badge>
          )}
        </div>
        {recording ? (
          <Button variant="danger" size="sm" icon={<Square size={13} />} onClick={stop}>
            {t("pilot.rec.stop")}
          </Button>
        ) : (
          <Button variant="primary" size="sm" icon={<Circle size={13} />} onClick={start}>
            {t("pilot.rec.start")}
          </Button>
        )}
      </div>

      {/* Resultado tras detener */}
      {!recording && lastFlight && lastFlight.length > 1 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-ink-500">
              {t("pilot.rec.result")} — {lastFlight.length} {t("pilot.rec.samples")} ·{" "}
              {fmtTime(lastFlight[lastFlight.length - 1].t)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="eyebrow mb-1">{t("pilot.rec.chartAlt")}</div>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#64748b" }} unit="s" />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", fontSize: 11 }}
                    />
                    <Line type="monotone" dataKey="alt" stroke="#22d3ee" dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">{t("pilot.rec.chartSf")}</div>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#64748b" }} unit="s" />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} domain={[0, 10]} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #ffffff20", fontSize: 11 }}
                    />
                    <Line type="monotone" dataKey="sf" stroke="#f59e0b" dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={handleDownload}>
              {t("pilot.rec.download")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Database size={13} />}
              onClick={handleSave}
              disabled={!selectedDrone || saveState === "saving" || saveState === "saved"}
            >
              {saveState === "saving" ? t("pilot.rec.saving") : t("pilot.rec.save")}
            </Button>
            {saveState === "saved" && (
              <span className="inline-flex items-center gap-1 text-[12px] text-good">
                <CheckCircle2 size={13} /> {t("pilot.rec.saved")}
              </span>
            )}
            {saveState === "error" && (
              <span className="inline-flex items-center gap-1 text-[12px] text-crit">
                <AlertTriangle size={13} /> {t("pilot.rec.error")}
              </span>
            )}
            {!selectedDrone && (
              <span className="text-[11px] text-ink-500">{t("pilot.rec.needDrone")}</span>
            )}
          </div>
        </div>
      )}

      {!recording && !lastFlight && (
        <p className="mt-3 text-[12px] text-ink-500">{t("pilot.rec.empty")}</p>
      )}
    </Surface>
  );
}
