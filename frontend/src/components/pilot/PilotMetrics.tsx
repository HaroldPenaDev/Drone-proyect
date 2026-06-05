import {
  ArrowUpDown,
  Gauge,
  MoveHorizontal,
  Mountain,
  ShieldCheck,
  Timer,
  Wind,
  Zap,
} from "lucide-react";
import { Metric, Surface } from "@/components/ui";
import { usePilotStore } from "@/pilot/pilotStore";
import { safetyFactorToHex } from "@/components/drone-viewer/thermal";
import { useT } from "@/i18n";
import type { TranslationKey } from "@/i18n";

function sfTone(sf: number): "good" | "warn" | "crit" | "accent" {
  if (sf < 1.5) return "crit";
  if (sf < 2.0) return "warn";
  if (sf < 5.0) return "good";
  return "accent";
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const MOTOR_LABELS = ["M1", "M2", "M3", "M4"];

/** Panel de telemetría completo del pilotaje, alimentado por el store (~15 Hz). */
export function PilotMetrics() {
  const t = useT();
  const m = usePilotStore((s) => s.metrics);
  const snapshot = usePilotStore((s) => s.snapshot);

  if (!m) {
    return (
      <Surface padded>
        <div className="text-sm text-ink-500">{t("pilot.metrics.waiting")}</div>
      </Surface>
    );
  }

  return (
    <div className="space-y-4">
      {/* Vuelo */}
      <section>
        <div className="eyebrow mb-2">{t("pilot.section.flight")}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Metric
            label={t("pilot.metric.altitude")}
            value={m.altitude.toFixed(1)}
            unit="m"
            tone="accent"
            icon={<Mountain size={14} />}
            hint={`${t("pilot.metric.target")} ${m.targetAlt.toFixed(1)} m`}
          />
          <Metric
            label={t("pilot.metric.throttle")}
            value={m.throttlePct.toFixed(0)}
            unit="%"
            icon={<Gauge size={14} />}
            hint={`${m.totalThrust.toFixed(1)} N`}
          />
          <Metric
            label={t("pilot.metric.worstSf")}
            value={m.worstSf > 9.9 ? "9.9+" : m.worstSf.toFixed(2)}
            tone={sfTone(m.worstSf)}
            icon={<ShieldCheck size={14} />}
          />
          <Metric
            label={t("pilot.metric.gspeed")}
            value={m.groundSpeed.toFixed(1)}
            unit="m/s"
            size="sm"
            icon={<MoveHorizontal size={14} />}
          />
          <Metric
            label={t("pilot.metric.vspeed")}
            value={m.verticalSpeed.toFixed(1)}
            unit="m/s"
            size="sm"
            icon={<ArrowUpDown size={14} />}
          />
          <Metric
            label={t("pilot.metric.flightTime")}
            value={fmtTime(m.flightTime)}
            size="sm"
            icon={<Timer size={14} />}
            hint={`${m.distance.toFixed(0)} m`}
          />
          <Metric
            label={t("pilot.metric.wind")}
            value={m.windSpeed.toFixed(1)}
            unit="m/s"
            size="sm"
            icon={<Wind size={14} />}
            tone={m.windSpeed >= 10 ? "crit" : m.windSpeed >= 5 ? "warn" : "default"}
            hint={m.windSpeed > 0.1 ? `${m.windDir.toFixed(0)}°` : undefined}
          />
        </div>
      </section>

      {/* Actitud + posición */}
      <section>
        <div className="eyebrow mb-2">{t("pilot.metric.attitude")}</div>
        <Surface padded>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(
              [
                ["pilot.attitude.roll", `${m.rollDeg.toFixed(0)}°`],
                ["pilot.attitude.pitch", `${m.pitchDeg.toFixed(0)}°`],
                ["pilot.attitude.yaw", `${m.yawDeg.toFixed(0)}°`],
                ["pilot.metric.posX", `${m.posX.toFixed(1)} m`],
                ["pilot.metric.posZ", `${m.posZ.toFixed(1)} m`],
                ["pilot.metric.distance", `${m.distance.toFixed(0)} m`],
              ] as [TranslationKey, string][]
            ).map(([key, val]) => (
              <div key={key} className="py-1">
                <div className="font-mono font-bold text-base text-white">{val}</div>
                <div className="text-[10px] text-ink-500 uppercase tracking-wider">{t(key)}</div>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      {/* Motores */}
      <section>
        <div className="eyebrow mb-2 flex items-center gap-1.5">
          <Zap size={12} className="text-accent" />
          {t("pilot.section.motors")}
        </div>
        <Surface padded>
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-x-3 gap-y-1.5 text-[12px]">
            <div className="text-[10px] text-ink-500 uppercase tracking-wider"></div>
            <div className="text-[10px] text-ink-500 uppercase tracking-wider text-right">
              {t("analysis.radar.thrust")}
            </div>
            <div className="text-[10px] text-ink-500 uppercase tracking-wider text-right">RPM</div>
            <div className="text-[10px] text-ink-500 uppercase tracking-wider text-right">
              {t("sf.short")}
            </div>
            {(snapshot?.arms ?? []).map((arm, i) => (
              <div key={i} className="contents">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: safetyFactorToHex(arm.safety_factor) }}
                  />
                  <span className="font-medium text-white/90">{MOTOR_LABELS[i]}</span>
                </div>
                <div className="font-mono text-right text-white/90">{arm.thrust.toFixed(2)} N</div>
                <div className="font-mono text-right text-ink-500">{Math.round(arm.rpm).toLocaleString()}</div>
                <div
                  className="font-mono text-right font-semibold"
                  style={{ color: safetyFactorToHex(arm.safety_factor) }}
                >
                  {arm.safety_factor > 9.9 ? "9.9+" : arm.safety_factor.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </div>
  );
}
