import { create } from "zustand";
import type { Drone, DroneCreate } from "@/types";
import { fetchDrones, createDrone as apiCreateDrone } from "@/api/drones";

interface DroneState {
  drones: Drone[];
  selectedDrone: Drone | null;
  loading: boolean;
  loadDrones: () => Promise<void>;
  selectDrone: (drone: Drone | null) => void;
  addDrone: (data: DroneCreate) => Promise<Drone>;
}

export const useDroneStore = create<DroneState>((set) => ({
  drones: [],
  selectedDrone: null,
  loading: false,

  loadDrones: async () => {
    set({ loading: true });
    const drones = await fetchDrones();
    set({ drones, loading: false });
    if (drones.length > 0) {
      set((state) => ({
        selectedDrone: state.selectedDrone ?? drones[0],
      }));
    }
  },

  selectDrone: (drone: Drone | null) => set({ selectedDrone: drone }),

  addDrone: async (data: DroneCreate) => {
    const drone = await apiCreateDrone(data);
    set((state) => ({ drones: [drone, ...state.drones] }));
    return drone;
  },
}));
