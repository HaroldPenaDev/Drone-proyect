import { useEffect, useCallback } from "react";
import type { Mission, MissionCreate } from "@/types";
import {
  fetchMissions,
  createMission as apiCreate,
  startMission as apiStart,
  stopMission as apiStop,
} from "@/api/missions";
import { create } from "zustand";

interface MissionState {
  missions: Mission[];
  activeMission: Mission | null;
  loading: boolean;
  setMissions: (missions: Mission[]) => void;
  setActiveMission: (mission: Mission | null) => void;
  setLoading: (loading: boolean) => void;
}

const useMissionStore = create<MissionState>((set) => ({
  missions: [],
  activeMission: null,
  loading: false,
  setMissions: (missions: Mission[]) => {
    const active = missions.find((m) => m.status === "running") ?? null;
    set({ missions, activeMission: active });
  },
  setActiveMission: (mission: Mission | null) => set({ activeMission: mission }),
  setLoading: (loading: boolean) => set({ loading }),
}));

interface UseMissionsResult {
  missions: Mission[];
  activeMission: Mission | null;
  loading: boolean;
  loadMissions: () => Promise<void>;
  createMission: (data: MissionCreate) => Promise<Mission>;
  startMission: (missionId: string) => Promise<void>;
  stopMission: (missionId: string) => Promise<void>;
}

export function useMissions(droneId: string | null): UseMissionsResult {
  const missions = useMissionStore((s) => s.missions);
  const activeMission = useMissionStore((s) => s.activeMission);
  const loading = useMissionStore((s) => s.loading);
  const setMissions = useMissionStore((s) => s.setMissions);
  const setLoading = useMissionStore((s) => s.setLoading);

  const loadMissions = useCallback(async () => {
    if (!droneId) return;
    setLoading(true);
    const result = await fetchMissions(droneId);
    setMissions(result);
    setLoading(false);
  }, [droneId, setMissions, setLoading]);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  const createMission = async (data: MissionCreate): Promise<Mission> => {
    const mission = await apiCreate(data);
    await loadMissions();
    return mission;
  };

  const startMission = async (missionId: string): Promise<void> => {
    await apiStart(missionId);
    await loadMissions();
  };

  const stopMission = async (missionId: string): Promise<void> => {
    await apiStop(missionId);
    await loadMissions();
  };

  return {
    missions,
    activeMission,
    loading,
    loadMissions,
    createMission,
    startMission,
    stopMission,
  };
}
