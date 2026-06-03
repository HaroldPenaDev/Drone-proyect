import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Layers, Sparkles } from "lucide-react";
import { useDroneStore } from "@/stores/droneStore";
import { useMissions } from "@/hooks/useMissions";
import { fetchMissionTelemetry } from "@/api/playback";
import type { DroneSnapshot, Mission, TelemetryPoint } from "@/types";
import { DroneScene } from "@/components/drone-viewer/DroneScene";
import { SafetyFactorGauge } from "@/components/dashboard/SafetyFactorGauge";
import { PageHeader, Surface, Metric } from "@/components/ui";
import { Timeline, PlaybackControls } from "@/components/playback";
import { ARM_LABEL_KEYS } from "@/utils/constants";
import { useT } from "@/i18n";

const TICK_MS = 100;

export function PlaybackPage() {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const loadDrones = useDroneStore((s) => s.loadDrones);
  const { missions } = useMissions(selectedDrone?.id ?? null);
  const t = useT();

  const completedMissions = useMemo(
    () =>
      missions.filter(
        (m) =>
          (m.status === "completed" || m.status === "aborted") &&
          m.started_at &&
          m.ended_at,
      ),
    [missions],
  );

  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [points, setPoints] = useState<TelemetryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0); // 0..1
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    loadDrones();
  }, [loadDrones]);

  // Auto-pick most recent
  useEffect(() => {
    if (!selectedMission && completedMissions.length > 0) {
      setSelectedMission(completedMissions[0]);
    }
  }, [completedMissions, selectedMission]);

  // Load telemetry for selected mission
  useEffect(() => {
    if (!selectedMission || !selectedDrone) return;
    if (!selectedMission.started_at || !selectedMission.ended_at) return;
    setLoading(true);
    setPosition(0);
    setPlaying(false);
    fetchMissionTelemetry(
      selectedDrone.id,
      new Date(selectedMission.started_at),
      new Date(selectedMission.ended_at),
    )
      .then((res) => setPoints(res.points))
      .finally(() => setLoading(false));
  }, [selectedMission, selectedDrone]);

  const startTime = selectedMission?.started_at
    ? new Date(selectedMission.started_at).getTime()
    : 0;
  const endTime = selectedMission?.ended_at
    ? new Date(selectedMission.ended_at).getTime()
    : 0;
  const duration = Math.max(0, (endTime - startTime) / 1000);

  // Animation loop
  const lastTickRef = useRef<number>(0);
  useEffect(() => {
    if (!playing || duration === 0) return;
    let frame = 0;
    const loop = (ts: number) => {
      if (lastTickRef.current === 0) lastTickRef.current = ts;
      const dt = (ts - lastTickRef.current) / 1000;
      lastTickRef.current = ts;
      setPosition((p) => {
        const advance = (dt * speed) / duration;
        const next = p + advance;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      lastTickRef.current = 0;
    };
  }, [playing, duration, speed]);

  // Build snapshot at current position
  const snapshot = useMemo<DroneSnapshot | null>(() => {
    if (!selectedMission || points.length === 0 || duration === 0) return null;
    const tTarget = startTime + position * duration * 1000;

    // Find latest sample per arm at or before tTarget.
    const perArm: Record<number, TelemetryPoint> = {};
    for (const p of points) {
      const t = new Date(p.timestamp).getTime();
      if (t > tTarget) continue;
      const existing = perArm[p.arm_index];
      if (!existing || new Date(existing.timestamp).getTime() < t) {
        perArm[p.arm_index] = p;
      }
    }
    const arms = [0, 1, 2, 3].map((i) => {
      const p = perArm[i];
      return {
        arm_index: i,
        thrust: p?.thrust ?? 0,
        torque: p?.torque ?? 0,
        safety_factor: p?.safety_factor ?? 10,
        degradation_factor: p?.degradation_factor ?? 0,
      };
    }) as DroneSnapshot["arms"];
    return {
      drone_id: selectedDrone?.id ?? "",
      timestamp: new Date(tTarget).toISOString(),
      arms,
      altitude: 0,
      roll: 0,
      pitch: 0,
      yaw: 0,
    };
  }, [points, position, duration, startTime, selectedMission, selectedDrone]);

  const seekRelative = (deltaSec: number) => {
    if (duration === 0) return;
    setPosition((p) => Math.max(0, Math.min(1, p + deltaSec / duration)));
  };

  const reset = () => {
    setPosition(0);
    setPlaying(false);
  };

  const worstSF = snapshot
    ? Math.min(...snapshot.arms.map((a) => a.safety_factor))
    : 10;
  const peakThrust = snapshot
    ? Math.max(...snapshot.arms.map((a) => a.thrust))
    : 0;
  const sfTone = worstSF < 1.5 ? "crit" : worstSF < 3 ? "warn" : "good";

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        eyebrow={t("playback.eyebrow")}
        title={t("playback.title")}
        description={t("playback.description")}
      />

      {/* Mission selector */}
      <Surface padded>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Layers size={16} className="text-accent shrink-0" strokeWidth={1.75} />
            <select
              value={selectedMission?.id ?? ""}
              onChange={(e) => {
                const m = completedMissions.find((x) => x.id === e.target.value);
                setSelectedMission(m ?? null);
              }}
              className="flex-1 max-w-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/15 rounded-lg px-3 py-2 text-sm text-white font-display focus:outline-none focus:border-accent/40"
            >
              {completedMissions.length === 0 && (
                <option value="">{t("playback.empty")}</option>
              )}
              {completedMissions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id.slice(0, 8)} ·{" "}
                  {m.movements.slice(0, 4).join(" → ")}
                  {m.movements.length > 4 ? "…" : ""} ·{" "}
                  {m.started_at
                    ? new Date(m.started_at).toLocaleString("es", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "?"}
                </option>
              ))}
            </select>
          </div>
          {selectedMission && (
            <div className="flex items-center gap-3 text-[11px] text-ink-500 font-mono">
              <span>
                <Clock size={11} className="inline mr-1 -mt-px" strokeWidth={2} />
                {formatDuration(duration)}
              </span>
              <span>·</span>
              <span>{points.length.toLocaleString()} puntos</span>
            </div>
          )}
        </div>
      </Surface>

      {loading && (
        <Surface padded>
          <div className="text-center text-ink-500 text-sm py-2">
            {t("common.loading")}
          </div>
        </Surface>
      )}

      {selectedMission && !loading && points.length === 0 && (
        <Surface padded>
          <div className="text-center text-ink-500 text-sm py-4">
            {t("playback.noTelemetry")}
          </div>
        </Surface>
      )}

      {snapshot && !loading && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <DroneScene snapshot={snapshot} height="h-[440px]" />
            </div>
            <div className="space-y-3">
              <Metric
                label={t("playback.metric.minSf")}
                value={worstSF.toFixed(2)}
                tone={sfTone}
                hint={`${t("playback.metric.worstArm")} ${t(
                  ARM_LABEL_KEYS[
                    snapshot.arms.reduce(
                      (idx, a, i) =>
                        a.safety_factor < snapshot.arms[idx].safety_factor ? i : idx,
                      0,
                    )
                  ],
                )}`}
              />
              <Metric
                label={t("playback.metric.peakThrust")}
                value={peakThrust.toFixed(2)}
                unit="N"
                tone="accent"
              />
              <Metric
                label={t("playback.metric.missionTime")}
                value={formatDuration(position * duration)}
                hint={`/ ${formatDuration(duration)}`}
              />
            </div>
          </div>

          {/* Timeline + controls */}
          <Surface padded>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-display font-semibold text-white text-sm">
                {t("playback.timeline.title")}
              </h3>
              <span className="eyebrow flex items-center gap-1.5">
                <Sparkles size={10} strokeWidth={2} />
                {t("playback.timeline.legend")}
              </span>
            </div>
            <Timeline
              duration={duration}
              position={position}
              onSeek={setPosition}
              points={points}
              startTime={startTime}
            />
            <div className="flex items-center justify-between mt-5">
              <PlaybackControls
                playing={playing}
                speed={speed}
                onTogglePlay={() => setPlaying((p) => !p)}
                onSpeedChange={setSpeed}
                onSeekRelative={seekRelative}
                onReset={reset}
              />
              <div className="text-[11px] text-ink-500 font-mono">
                {t("playback.currentState")}{" "}
                <span className="text-white">
                  {new Date(startTime + position * duration * 1000).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </Surface>

          {/* Live SF gauges synced to scrubber */}
          <div>
            <div className="flex items-baseline justify-between mb-2.5">
              <h3 className="section-title">{t("playback.section.sfNow")}</h3>
              <span className="eyebrow">{t("playback.section.sfNowHint")}</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {snapshot.arms.map((arm) => (
                <SafetyFactorGauge
                  key={arm.arm_index}
                  armIndex={arm.arm_index}
                  value={arm.safety_factor}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

// Suppress unused warning for TICK_MS (constant kept for potential future use).
void TICK_MS;
