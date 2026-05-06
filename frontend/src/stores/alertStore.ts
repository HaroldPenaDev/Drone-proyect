import { create } from "zustand";
import type { Alert } from "@/types";
import { apiClient } from "@/api/client";

interface AlertState {
  alerts: Alert[];
  unreadCount: number;
  loadAlerts: (droneId?: string) => Promise<void>;
  addAlert: (alert: Alert) => void;
  markAllRead: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,

  loadAlerts: async (droneId?: string) => {
    const params = droneId ? { drone_id: droneId } : {};
    const response = await apiClient.get<Alert[]>("/alerts", { params });
    set({ alerts: response.data, unreadCount: response.data.length });
  },

  addAlert: (alert: Alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    })),

  markAllRead: () => set({ unreadCount: 0 }),
}));
