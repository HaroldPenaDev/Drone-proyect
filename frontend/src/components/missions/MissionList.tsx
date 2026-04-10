import type { Mission } from "@/types";

interface MissionListProps {
  missions: Mission[];
  onStart: (missionId: string) => Promise<void>;
  onStop: (missionId: string) => Promise<void>;
}

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-yellow-900/50 text-yellow-400",
  running: "bg-green-900/50 text-green-400",
  completed: "bg-blue-900/50 text-blue-400",
  aborted: "bg-red-900/50 text-red-400",
};

export function MissionList({ missions, onStart, onStop }: MissionListProps) {
  if (missions.length === 0) {
    return <div className="text-gray-500 text-sm py-4">No missions yet</div>;
  }

  return (
    <div className="space-y-2">
      {missions.map((mission) => (
        <div
          key={mission.id}
          className="bg-drone-panel rounded-lg p-3 border border-drone-border flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGES[mission.status]}`}>
                {mission.status}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(mission.created_at).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {mission.movements.join(" → ")}
            </div>
          </div>
          <div className="flex gap-2">
            {mission.status === "pending" && (
              <button
                onClick={() => onStart(mission.id)}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start
              </button>
            )}
            {mission.status === "running" && (
              <button
                onClick={() => onStop(mission.id)}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
