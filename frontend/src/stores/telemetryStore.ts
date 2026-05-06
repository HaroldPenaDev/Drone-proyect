import { create } from "zustand";
import type { DroneSnapshot, TelemetryPoint } from "@/types";
import { fetchTelemetryHistory } from "@/api/telemetry";
import { CHART_HISTORY_POINTS } from "@/utils/constants";

interface TelemetryState {
  latestSnapshot: DroneSnapshot | null;
  history: TelemetryPoint[];
  connected: boolean;
  updateSnapshot: (snapshot: DroneSnapshot) => void;
  setConnected: (connected: boolean) => void;
  loadHistory: (droneId: string, start?: string, stop?: string) => Promise<void>;
  clearHistory: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  latestSnapshot: null,
  history: [],
  connected: false,

  updateSnapshot: (snapshot: DroneSnapshot) => {
    set((state) => {
      const newPoints: TelemetryPoint[] = snapshot.arms.map((arm) => ({
        timestamp: snapshot.timestamp,
        arm_index: arm.arm_index,
        thrust: arm.thrust,
        torque: arm.torque,
        safety_factor: arm.safety_factor,
        degradation_factor: arm.degradation_factor,
      }));
      const updatedHistory = [...state.history, ...newPoints].slice(
        -CHART_HISTORY_POINTS * 4
      );
      return { latestSnapshot: snapshot, history: updatedHistory };
    });
  },

  setConnected: (connected: boolean) => set({ connected }),

  loadHistory: async (droneId: string, start = "-1h", stop = "now()") => {
    const points = await fetchTelemetryHistory(droneId, start, stop);
    set({ history: points });
  },

  clearHistory: () => set({ history: [], latestSnapshot: null }),
}));
