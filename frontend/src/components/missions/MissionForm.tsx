import { useState } from "react";
import { useDroneStore } from "@/stores/droneStore";
import type { MissionCreate } from "@/types";

const AVAILABLE_MOVEMENTS = [
  "hover", "ascend", "descend", "left", "right",
  "forward", "backward", "clockwise", "counterclockwise",
] as const;

interface MissionFormProps {
  onSubmit: (data: MissionCreate) => Promise<void>;
}

export function MissionForm({ onSubmit }: MissionFormProps) {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const [movements, setMovements] = useState<string[]>(["hover"]);
  const [submitting, setSubmitting] = useState(false);

  const addMovement = (movement: string) => {
    setMovements((prev) => [...prev, movement]);
  };

  const removeMovement = (index: number) => {
    setMovements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedDrone || movements.length === 0) return;
    setSubmitting(true);
    await onSubmit({ drone_id: selectedDrone.id, movements });
    setMovements(["hover"]);
    setSubmitting(false);
  };

  return (
    <div className="bg-drone-panel rounded-lg p-4 border border-drone-border">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">New Mission</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {AVAILABLE_MOVEMENTS.map((m) => (
          <button
            key={m}
            onClick={() => addMovement(m)}
            className="px-2 py-1 text-xs bg-drone-dark border border-drone-border rounded hover:border-drone-primary text-gray-300"
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 mb-3 min-h-[32px]">
        {movements.map((m, i) => (
          <span
            key={i}
            onClick={() => removeMovement(i)}
            className="px-2 py-1 text-xs bg-drone-primary/20 text-drone-primary rounded cursor-pointer hover:bg-drone-primary/30"
          >
            {m} x
          </span>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting || !selectedDrone || movements.length === 0}
        className="w-full py-2 bg-drone-primary text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-blue-600 transition-colors"
      >
        {submitting ? "Creating..." : "Create Mission"}
      </button>
    </div>
  );
}
