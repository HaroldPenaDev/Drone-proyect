import { useState } from "react";
import { Plus, X, Clock } from "lucide-react";
import { useDroneStore } from "@/stores/droneStore";
import { useMotorProfileStore } from "@/stores/motorProfileStore";
import { encodeMovement } from "@/components/missions/movement";
import type { MissionCreate } from "@/types";

const AVAILABLE_MOVEMENTS = [
  "hover", "ascend", "descend", "left", "right",
  "forward", "backward", "clockwise", "counterclockwise",
] as const;

interface Action {
  action: string;
  seconds: number;
}

interface MissionFormProps {
  onSubmit: (data: MissionCreate) => Promise<void>;
}

export function MissionForm({ onSubmit }: MissionFormProps) {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const efficiency = useMotorProfileStore((s) => s.efficiency);
  const [actions, setActions] = useState<Action[]>([{ action: "hover", seconds: 4 }]);
  const [submitting, setSubmitting] = useState(false);

  const usesProfile = efficiency.some((e) => e !== 100);

  const addAction = (action: string) =>
    setActions((prev) => [...prev, { action, seconds: 4 }]);

  const removeAction = (index: number) =>
    setActions((prev) => prev.filter((_, i) => i !== index));

  const setSeconds = (index: number, seconds: number) =>
    setActions((prev) =>
      prev.map((a, i) =>
        i === index ? { ...a, seconds: Math.max(1, Math.min(120, seconds)) } : a,
      ),
    );

  const totalSeconds = actions.reduce((sum, a) => sum + a.seconds, 0);

  const handleSubmit = async () => {
    if (!selectedDrone || actions.length === 0) return;
    setSubmitting(true);
    const moves = actions.map((a) => encodeMovement(a.action, a.seconds));
    // Embebe el perfil de motores como primer elemento si hay algún motor != 100%.
    const movements = usesProfile
      ? [JSON.stringify({ type: "flight_config", eff: efficiency.map((e) => e / 100) }), ...moves]
      : moves;
    await onSubmit({ drone_id: selectedDrone.id, movements });
    setActions([{ action: "hover", seconds: 4 }]);
    setSubmitting(false);
  };

  return (
    <div className="surface p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-1">Nueva Misión</h3>
      <p className="text-[11px] text-ink-500 mb-3">
        Agrega acciones y define cuántos segundos dura cada una.
      </p>

      {/* Paleta de acciones */}
      <div className="flex flex-wrap gap-2 mb-4">
        {AVAILABLE_MOVEMENTS.map((m) => (
          <button
            key={m}
            onClick={() => addAction(m)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-ink-50 border border-white/5 rounded hover:border-accent text-gray-300 transition-colors"
          >
            <Plus size={11} /> {m}
          </button>
        ))}
      </div>

      {/* Secuencia con duración por acción */}
      <div className="space-y-1.5 mb-3 min-h-[40px]">
        {actions.length === 0 && (
          <div className="text-[11px] text-ink-500 italic">Sin acciones — agrega al menos una.</div>
        )}
        {actions.map((a, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-lg px-2.5 py-1.5"
          >
            <span className="w-5 text-[10px] font-mono text-ink-500">{i + 1}</span>
            <span className="flex-1 text-xs text-white/90">{a.action}</span>
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-ink-500" />
              <input
                type="number"
                min={1}
                max={120}
                value={a.seconds}
                onChange={(e) => setSeconds(i, Number(e.target.value))}
                className="w-14 bg-ink-50 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right focus:border-accent outline-none"
              />
              <span className="text-[10px] text-ink-500">s</span>
            </div>
            <button
              onClick={() => removeAction(i)}
              className="text-ink-500 hover:text-crit transition-colors"
              aria-label="quitar"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3 text-[11px] text-ink-500">
        <span>{actions.length} acciones</span>
        <span className="font-mono">≈ {totalSeconds}s de vuelo</span>
      </div>

      {usesProfile && (
        <p className="text-[11px] text-accent/90 mb-2">
          ⚙️ Esta misión usará el perfil de motores configurado arriba.
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !selectedDrone || actions.length === 0}
        className="w-full py-2 bg-accent text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-accent/85 transition-colors"
      >
        {submitting ? "Creando..." : "Crear Misión"}
      </button>
      {!selectedDrone && (
        <p className="text-center text-[11px] text-ink-500 mt-2">Selecciona un dron primero</p>
      )}
    </div>
  );
}
