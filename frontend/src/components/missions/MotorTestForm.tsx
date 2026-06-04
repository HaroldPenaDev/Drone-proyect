import { useState } from "react";
import { useDroneStore } from "@/stores/droneStore";
import { useMissions } from "@/hooks/useMissions";

const MOTOR_LABELS = [
  { id: "m1", label: "M1", pos: "top-0 right-0",   dot: "bg-cyan-400",   arm: "Frontal Derecho" },
  { id: "m2", label: "M2", pos: "top-0 left-0",    dot: "bg-emerald-400", arm: "Frontal Izquierdo" },
  { id: "m3", label: "M3", pos: "bottom-0 left-0", dot: "bg-amber-400",  arm: "Trasero Izquierdo" },
  { id: "m4", label: "M4", pos: "bottom-0 right-0",dot: "bg-rose-400",   arm: "Trasero Derecho" },
] as const;

const PRESETS: { label: string; icon: string; throttles: Record<string, number> }[] = [
  { label: "Solo M1",     icon: "①",  throttles: { m1: 15,  m2: 0,   m3: 0,   m4: 0  } },
  { label: "Solo M2",     icon: "②",  throttles: { m1: 0,   m2: 15,  m3: 0,   m4: 0  } },
  { label: "Solo M3",     icon: "③",  throttles: { m1: 0,   m2: 0,   m3: 15,  m4: 0  } },
  { label: "Solo M4",     icon: "④",  throttles: { m1: 0,   m2: 0,   m3: 0,   m4: 15 } },
  { label: "M1 vs M3",   icon: "↕",  throttles: { m1: 15,  m2: 0,   m3: 15,  m4: 0  } },
  { label: "M2 vs M4",   icon: "↔",  throttles: { m1: 0,   m2: 15,  m3: 0,   m4: 15 } },
  { label: "Todos 7%",   icon: "◈",  throttles: { m1: 7,   m2: 7,   m3: 7,   m4: 7  } },
  { label: "Todos 15%",  icon: "◉",  throttles: { m1: 15,  m2: 15,  m3: 15,  m4: 15 } },
];

function getThrottleColor(value: number): string {
  if (value === 0)   return "text-gray-500";
  if (value <= 25)   return "text-blue-400";
  if (value <= 50)   return "text-cyan-400";
  if (value <= 75)   return "text-amber-400";
  return "text-rose-400";
}

function getBarColor(value: number): string {
  if (value === 0)   return "bg-gray-700";
  if (value <= 25)   return "bg-blue-500";
  if (value <= 50)   return "bg-cyan-500";
  if (value <= 75)   return "bg-amber-500";
  return "bg-rose-500";
}

interface MotorThrottles {
  m1: number; m2: number; m3: number; m4: number;
}

export function MotorTestForm() {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const { createMission, startMission } = useMissions(selectedDrone?.id ?? null);

  const [throttles, setThrottles] = useState<MotorThrottles>({
    m1: 50, m2: 50, m3: 50, m4: 50,
  });
  const [submitting, setSubmitting] = useState(false);
  const [launched, setLaunched] = useState(false);

  const setMotor = (key: keyof MotorThrottles, value: number) => {
    setThrottles((prev) => ({ ...prev, [key]: value }));
    setLaunched(false);
  };

  const applyPreset = (p: typeof PRESETS[number]) => {
    setThrottles(p.throttles as unknown as MotorThrottles);
    setLaunched(false);
  };

  const handleLaunch = async () => {
    if (!selectedDrone) return;
    setSubmitting(true);
    const payload = JSON.stringify({
      type: "motor_test",
      m1: throttles.m1 / 100,
      m2: throttles.m2 / 100,
      m3: throttles.m3 / 100,
      m4: throttles.m4 / 100,
    });
    const created = await createMission({
      drone_id: selectedDrone.id,
      movements: [payload],
    });
    if (created) {
      await startMission(created.id);
      setLaunched(true);
    }
    setSubmitting(false);
  };

  const allZero = Object.values(throttles).every((v) => v === 0);

  return (
    <div className="space-y-5">
      {/* Presets */}
      <div className="surface p-4 space-y-3">
        <p className="eyebrow">Presets rápidos</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-white/[0.03] border border-white/5 hover:border-accent/50 hover:bg-accent/5 transition-all duration-150 group"
            >
              <span className="text-lg leading-none group-hover:text-accent transition-colors">{p.icon}</span>
              <span className="text-[10px] text-ink-500 group-hover:text-accent/80 transition-colors leading-tight text-center">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sliders + Drone Diagram */}
      <div className="surface p-5 space-y-4">
        <p className="eyebrow">Configuración por motor</p>

        {/* Drone top-view diagram */}
        <div className="relative w-32 h-32 mx-auto my-2">
          {/* Arms */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-[2px] bg-white/10 rounded-full" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[2px] h-full bg-white/10 rounded-full" />
          </div>
          {/* Center body */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-[9px] text-ink-500">↑</span>
            </div>
          </div>
          {/* Motor dots */}
          {MOTOR_LABELS.map((m) => (
            <div key={m.id} className={`absolute ${m.pos} flex flex-col items-center gap-0.5`}>
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300`}
                style={{
                  borderColor: throttles[m.id as keyof MotorThrottles] > 0
                    ? undefined
                    : "rgba(255,255,255,0.08)",
                  backgroundColor: `rgba(0,0,0,${0.3 + throttles[m.id as keyof MotorThrottles] / 200})`,
                  boxShadow: throttles[m.id as keyof MotorThrottles] > 0
                    ? `0 0 ${throttles[m.id as keyof MotorThrottles] / 5}px 2px currentColor`
                    : "none",
                }}
              >
                <span className={`text-[10px] font-bold ${throttles[m.id as keyof MotorThrottles] > 0 ? getThrottleColor(throttles[m.id as keyof MotorThrottles]) : "text-gray-600"}`}>
                  {m.label}
                </span>
              </div>
              <span className={`text-[9px] font-mono font-bold ${getThrottleColor(throttles[m.id as keyof MotorThrottles])}`}>
                {throttles[m.id as keyof MotorThrottles]}%
              </span>
            </div>
          ))}
        </div>

        {/* Sliders */}
        <div className="space-y-3 pt-1">
          {MOTOR_LABELS.map((m) => {
            const val = throttles[m.id as keyof MotorThrottles];
            return (
              <div key={m.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${m.dot}`} />
                    <span className="text-xs font-medium text-white/80">{m.label}</span>
                    <span className="text-[10px] text-ink-500">{m.arm}</span>
                  </div>
                  <span className={`text-xs font-mono font-bold tabular-nums ${getThrottleColor(val)}`}>
                    {val}%
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-white/5">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-150 ${getBarColor(val)}`}
                    style={{ width: `${val}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={val}
                    onChange={(e) => setMotor(m.id as keyof MotorThrottles, Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Launch button */}
      <button
        id="motor-test-launch-btn"
        onClick={handleLaunch}
        disabled={submitting || !selectedDrone || allZero}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 ${
          launched
            ? "bg-good/20 border border-good/40 text-good"
            : "bg-gradient-to-r from-accent to-blue-500 text-white hover:opacity-90 shadow-glow"
        }`}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Iniciando...
          </span>
        ) : launched ? (
          "✓ Test en ejecución — Detén desde el historial"
        ) : allZero ? (
          "Ajusta al menos un motor para continuar"
        ) : (
          `🚀 Iniciar Motor Test`
        )}
      </button>

      {!selectedDrone && (
        <p className="text-center text-xs text-ink-500">Selecciona un dron primero</p>
      )}
    </div>
  );
}
