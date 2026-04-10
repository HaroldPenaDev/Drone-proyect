import { useDroneStore } from "@/stores/droneStore";
import { useMissions } from "@/hooks/useMissions";
import { MissionForm } from "@/components/missions/MissionForm";
import { MissionDetail } from "@/components/missions/MissionDetail";
import { MissionList } from "@/components/missions/MissionList";
import type { MissionCreate } from "@/types";

export function MissionsPage() {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const {
    missions,
    activeMission,
    createMission,
    startMission,
    stopMission,
  } = useMissions(selectedDrone?.id ?? null);

  const handleCreate = async (data: MissionCreate) => {
    await createMission(data);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Missions</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 space-y-4">
          <MissionForm onSubmit={handleCreate} />
          {activeMission && <MissionDetail mission={activeMission} />}
        </div>
        <div className="col-span-2">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Mission History
          </h3>
          <MissionList
            missions={missions}
            onStart={startMission}
            onStop={stopMission}
          />
        </div>
      </div>
    </div>
  );
}
