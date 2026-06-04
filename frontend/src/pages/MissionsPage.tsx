import { useState } from "react";
import { useDroneStore } from "@/stores/droneStore";
import { useMissions } from "@/hooks/useMissions";
import { MissionForm } from "@/components/missions/MissionForm";
import { MissionDetail } from "@/components/missions/MissionDetail";
import { MissionList } from "@/components/missions/MissionList";
import { MotorTestForm } from "@/components/missions/MotorTestForm";
import type { MissionCreate } from "@/types";
import { PageHeader } from "@/components/ui";
import { useT } from "@/i18n";

type Tab = "flight" | "motor_test";

export function MissionsPage() {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const t = useT();
  const [activeTab, setActiveTab] = useState<Tab>("flight");
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
    <div className="space-y-5 animate-fade-in">
      <PageHeader title={t("missions.title")} />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl surface w-fit">
        <button
          id="tab-flight-missions"
          onClick={() => setActiveTab("flight")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            activeTab === "flight"
              ? "bg-accent text-white shadow-glow"
              : "text-ink-500 hover:text-white/80"
          }`}
        >
          ✈️ Misión de Vuelo
        </button>
        <button
          id="tab-motor-test"
          onClick={() => setActiveTab("motor_test")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            activeTab === "motor_test"
              ? "bg-accent text-white shadow-glow"
              : "text-ink-500 hover:text-white/80"
          }`}
        >
          ⚙️ Test de Motores
        </button>
      </div>

      {activeTab === "flight" && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1 space-y-4">
            <MissionForm onSubmit={handleCreate} />
            {activeMission && <MissionDetail mission={activeMission} />}
          </div>
          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              {t("missions.history")}
            </h3>
            <MissionList
              missions={missions}
              onStart={startMission}
              onStop={stopMission}
            />
          </div>
        </div>
      )}

      {activeTab === "motor_test" && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <MotorTestForm />
          </div>
          <div className="col-span-2">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Historial de Tests
            </h3>
            <MissionList
              missions={missions.filter((m) => {
                try {
                  const first = m.movements[0];
                  const parsed = JSON.parse(first);
                  return parsed?.type === "motor_test";
                } catch {
                  return false;
                }
              })}
              onStart={startMission}
              onStop={stopMission}
            />
          </div>
        </div>
      )}
    </div>
  );
}
