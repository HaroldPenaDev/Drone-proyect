import { create } from "zustand";
import type { DroneSnapshot } from "@/types";
import type { PilotMetrics } from "@/pilot/PilotEngine";
import type { FlightSample } from "@/pilot/recorder";

/**
 * Estado reactivo del pilotaje en vivo. El loop de física (60 fps) publica
 * aquí el snapshot + métricas a ~15 Hz; los paneles React leen de este store.
 * El movimiento 3D del dron NO pasa por aquí (se muta directo en el render
 * loop para mantener la fluidez). También expone el estado de la grabación.
 */
interface PilotStoreState {
  snapshot: DroneSnapshot | null;
  metrics: PilotMetrics | null;
  // Grabación
  recording: boolean;
  recElapsed: number;
  recCount: number;
  lastFlight: FlightSample[] | null;

  publish: (snapshot: DroneSnapshot, metrics: PilotMetrics) => void;
  setRecording: (recording: boolean) => void;
  setRecStats: (elapsed: number, count: number) => void;
  setLastFlight: (samples: FlightSample[] | null) => void;
  clear: () => void;
}

export const usePilotStore = create<PilotStoreState>((set) => ({
  snapshot: null,
  metrics: null,
  recording: false,
  recElapsed: 0,
  recCount: 0,
  lastFlight: null,

  publish: (snapshot, metrics) => set({ snapshot, metrics }),
  setRecording: (recording) =>
    set(recording ? { recording, recElapsed: 0, recCount: 0 } : { recording }),
  setRecStats: (recElapsed, recCount) => set({ recElapsed, recCount }),
  setLastFlight: (lastFlight) => set({ lastFlight }),
  clear: () =>
    set({ snapshot: null, metrics: null, recording: false, recElapsed: 0, recCount: 0 }),
}));
