import type { Mission } from "@/types";
import {
  formatMovement,
  actionMovements,
  missionMotorProfile,
} from "@/components/missions/movement";

interface MissionDetailProps {
  mission: Mission;
}

export function MissionDetail({ mission }: MissionDetailProps) {
  return (
    <div className="surface p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">
        Active Mission
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Status</span>
          <span className="text-green-400 font-medium">{mission.status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Started</span>
          <span className="text-gray-300">
            {mission.started_at
              ? new Date(mission.started_at).toLocaleTimeString()
              : "—"}
          </span>
        </div>
        {missionMotorProfile(mission.movements) && (
          <div className="flex justify-between">
            <span className="text-gray-400">Motores</span>
            <span className="text-accent font-mono text-xs">
              {missionMotorProfile(mission.movements)!.map((e) => `${e}%`).join(" · ")}
            </span>
          </div>
        )}
        <div>
          <span className="text-gray-400">Movements</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {actionMovements(mission.movements).map((m, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs bg-ink-50 rounded text-gray-300"
              >
                {formatMovement(m)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
