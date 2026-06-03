import type { Mission } from "@/types";
import { useT } from "@/i18n";

interface MissionPickerProps {
  missions: Mission[];
  selectedIds: string[];
  onToggle: (missionId: string) => void;
  onClear: () => void;
}

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-yellow-900/50 text-yellow-300",
  running: "bg-green-900/50 text-green-300",
  completed: "bg-blue-900/50 text-blue-300",
  aborted: "bg-red-900/50 text-red-300",
};

const formatDuration = (start: string | null, end: string | null): string => {
  if (!start) return "—";
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((endMs - startMs) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

export function MissionPicker({
  missions,
  selectedIds,
  onToggle,
  onClear,
}: MissionPickerProps) {
  const t = useT();
  const eligible = missions.filter(
    (m) => m.status === "completed" || m.status === "aborted" || m.status === "running",
  );

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-200">
          {t("analysis.picker.title")}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {selectedIds.length} {t("analysis.picker.selected")}
          </span>
          {selectedIds.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-white"
            >
              {t("analysis.picker.clear")}
            </button>
          )}
        </div>
      </div>

      {eligible.length === 0 ? (
        <div className="text-gray-500 text-sm py-6 text-center">
          {t("analysis.picker.empty")}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
          {eligible.map((mission) => {
            const checked = selectedIds.includes(mission.id);
            return (
              <label
                key={mission.id}
                className={`flex items-start gap-3 rounded-md p-2 cursor-pointer transition-colors border ${
                  checked
                    ? "border-accent/40 bg-accent/5 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]"
                    : "border-transparent hover:bg-white/[0.03]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(mission.id)}
                  className="mt-1 accent-accent"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        STATUS_BADGES[mission.status] ?? "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {mission.status}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {new Date(mission.created_at).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-gray-400 ml-auto">
                      {formatDuration(mission.started_at, mission.ended_at)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {mission.movements.length > 0
                      ? mission.movements.join(" → ")
                      : "(sin movimientos)"}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
