import { Wind } from "lucide-react";
import { useWindStore } from "@/pilot/windStore";
import { usePilotStore } from "@/pilot/pilotStore";

/**
 * Indicador de viento sobre la escena: flecha de dirección + velocidad en vivo
 * (incluye ráfagas). Se oculta si no hay viento. Pensado para un contenedor
 * `relative`.
 */
export function WindHud() {
  const baseSpeed = useWindStore((s) => s.speed);
  const dir = useWindStore((s) => s.dir);
  const metrics = usePilotStore((s) => s.metrics);

  if (baseSpeed <= 0) return null;

  const liveSpeed = metrics?.windSpeed ?? baseSpeed;
  const color = baseSpeed >= 10 ? "#ef4444" : baseSpeed >= 5 ? "#f59e0b" : "#22d3ee";

  return (
    <div className="absolute top-4 right-4 surface !bg-ink-50/70 backdrop-blur-md px-3 py-2 pointer-events-none flex items-center gap-2.5">
      <Wind size={15} style={{ color }} />
      <div className="leading-tight">
        <div className="text-[12px] font-mono font-semibold text-white">
          {liveSpeed.toFixed(1)} m/s
        </div>
        <div className="text-[9px] text-ink-500 uppercase tracking-wider">viento</div>
      </div>
      <div style={{ transform: `rotate(${dir}deg)`, color }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
          <polyline points="13 6 19 12 13 18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
