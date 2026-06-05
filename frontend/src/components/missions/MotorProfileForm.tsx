import { RotateCcw } from "lucide-react";
import { useMotorProfileStore } from "@/stores/motorProfileStore";

/**
 * Configuración del PERFIL de motores (eficiencia/potencia %) que la Misión de
 * Vuelo aplicará. 100 % = motor sano. Persiste vía store (no se reinicia al
 * cambiar de pestaña). Motores desiguales -> desgaste asimétrico en la sim.
 */

const MOTOR_LABELS = [
  { id: 0, label: "M1", pos: "top-0 right-0", dot: "bg-cyan-400", arm: "Frontal Derecho" },
  { id: 1, label: "M2", pos: "top-0 left-0", dot: "bg-emerald-400", arm: "Frontal Izquierdo" },
  { id: 2, label: "M3", pos: "bottom-0 left-0", dot: "bg-amber-400", arm: "Trasero Izquierdo" },
  { id: 3, label: "M4", pos: "bottom-0 right-0", dot: "bg-rose-400", arm: "Trasero Derecho" },
] as const;

const PRESETS: { label: string; values: number[] }[] = [
  { label: "Todos sanos", values: [100, 100, 100, 100] },
  { label: "M1 desgastado", values: [80, 100, 100, 100] },
  { label: "Desbalance frontal", values: [90, 90, 110, 110] },
  { label: "Asimétrico", values: [100, 85, 100, 115] },
];

function effColor(v: number): string {
  if (v < 70) return "text-rose-400";
  if (v < 90) return "text-amber-400";
  if (v <= 110) return "text-emerald-400";
  return "text-cyan-400";
}
function effBar(v: number): string {
  if (v < 70) return "bg-rose-500";
  if (v < 90) return "bg-amber-500";
  if (v <= 110) return "bg-emerald-500";
  return "bg-cyan-500";
}

export function MotorProfileForm() {
  const efficiency = useMotorProfileStore((s) => s.efficiency);
  const setMotor = useMotorProfileStore((s) => s.setMotor);
  const setAll = useMotorProfileStore((s) => s.setAll);
  const reset = useMotorProfileStore((s) => s.reset);

  const dirty = efficiency.some((v) => v !== 100);

  return (
    <div className="surface p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Configuración de motores</p>
          <p className="text-[11px] text-ink-500 mt-0.5">
            Potencia de cada motor (100 % = sano). La misión la usará.
          </p>
        </div>
        {dirty && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 text-[11px] text-ink-500 hover:text-white transition-colors"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {/* Presets */}
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setAll(p.values)}
            className="py-1.5 px-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-accent/50 hover:bg-accent/5 text-[11px] text-ink-500 hover:text-accent transition-all"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Diagrama top-view */}
      <div className="relative w-28 h-28 mx-auto my-1">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-[2px] bg-white/10 rounded-full" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[2px] h-full bg-white/10 rounded-full" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <span className="text-[9px] text-ink-500">↑</span>
          </div>
        </div>
        {MOTOR_LABELS.map((m) => {
          const v = efficiency[m.id];
          return (
            <div key={m.id} className={`absolute ${m.pos} flex flex-col items-center`}>
              <div
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  boxShadow: `0 0 ${v / 8}px 1px currentColor`,
                }}
              >
                <span className={`text-[9px] font-bold ${effColor(v)}`}>{m.label}</span>
              </div>
              <span className={`text-[9px] font-mono font-bold ${effColor(v)}`}>{v}%</span>
            </div>
          );
        })}
      </div>

      {/* Sliders */}
      <div className="space-y-2.5">
        {MOTOR_LABELS.map((m) => {
          const v = efficiency[m.id];
          return (
            <div key={m.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m.dot}`} />
                  <span className="text-xs font-medium text-white/80">{m.label}</span>
                  <span className="text-[10px] text-ink-500">{m.arm}</span>
                </div>
                <span className={`text-xs font-mono font-bold tabular-nums ${effColor(v)}`}>{v}%</span>
              </div>
              <div className="relative h-2 rounded-full bg-white/5">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-150 ${effBar(v)}`}
                  style={{ width: `${(v / 150) * 100}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={150}
                  step={5}
                  value={v}
                  onChange={(e) => setMotor(m.id, Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
