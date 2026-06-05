import { Wind } from "lucide-react";
import { useWindStore } from "@/pilot/windStore";

/**
 * Control de clima por BOTONES: presets de viento (Calma / Brisa / Viento
 * fuerte / Ventisca) + dirección (N/E/S/O). Escribe al windStore que el
 * PilotEngine lee en vivo.
 */

const WEATHER = [
  { key: "calm", label: "Calma", icon: "😌", speed: 0, gust: 0 },
  { key: "breeze", label: "Brisa", icon: "🍃", speed: 3, gust: 0.3 },
  { key: "strong", label: "Viento fuerte", icon: "💨", speed: 7, gust: 0.5 },
  { key: "gale", label: "Ventisca", icon: "🌪️", speed: 12, gust: 0.9 },
];

const DIRS = [
  { label: "N", icon: "↑", deg: 270 },
  { label: "E", icon: "→", deg: 0 },
  { label: "S", icon: "↓", deg: 90 },
  { label: "O", icon: "←", deg: 180 },
];

export function WindControl() {
  const speed = useWindStore((s) => s.speed);
  const gust = useWindStore((s) => s.gust);
  const dir = useWindStore((s) => s.dir);
  const setWeather = useWindStore((s) => s.setWeather);
  const setDir = useWindStore((s) => s.setDir);

  const activeWeather = WEATHER.find((w) => w.speed === speed && w.gust === gust)?.key;

  return (
    <div className="surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Wind size={14} className="text-accent" />
        <span className="eyebrow-accent">Clima / Viento</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {WEATHER.map((w) => (
          <button
            key={w.key}
            onClick={() => setWeather(w.speed, w.gust)}
            className={`flex items-center gap-2 py-2 px-2.5 rounded-lg border text-[12px] transition-all ${
              activeWeather === w.key
                ? "border-accent/50 bg-accent/10 text-white"
                : "border-white/5 bg-white/[0.03] text-ink-500 hover:text-white hover:border-white/15"
            }`}
          >
            <span className="text-base leading-none">{w.icon}</span>
            <span>{w.label}</span>
          </button>
        ))}
      </div>

      {speed > 0 && (
        <div>
          <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-1.5">
            Dirección del viento
          </div>
          <div className="flex gap-2">
            {DIRS.map((d) => (
              <button
                key={d.label}
                onClick={() => setDir(d.deg)}
                className={`flex-1 py-1.5 rounded-lg border text-[12px] font-mono transition-all ${
                  dir === d.deg
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-white/5 bg-white/[0.03] text-ink-500 hover:text-white hover:border-white/15"
                }`}
              >
                {d.icon} {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
