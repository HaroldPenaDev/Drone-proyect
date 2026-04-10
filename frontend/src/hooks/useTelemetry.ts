import { useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTelemetryStore } from "@/stores/telemetryStore";
import type { DroneSnapshot, TelemetryPoint } from "@/types";

interface UseTelemetryResult {
  latestSnapshot: DroneSnapshot | null;
  history: TelemetryPoint[];
  connected: boolean;
  loadHistory: (start?: string, stop?: string) => Promise<void>;
}

export function useTelemetry(droneId: string | null): UseTelemetryResult {
  const connected = useWebSocket(droneId);
  const latestSnapshot = useTelemetryStore((s) => s.latestSnapshot);
  const history = useTelemetryStore((s) => s.history);
  const loadHistoryAction = useTelemetryStore((s) => s.loadHistory);
  const clearHistory = useTelemetryStore((s) => s.clearHistory);

  useEffect(() => {
    if (droneId) {
      loadHistoryAction(droneId);
    }
    return () => {
      clearHistory();
    };
  }, [droneId, loadHistoryAction, clearHistory]);

  const loadHistory = async (start?: string, stop?: string): Promise<void> => {
    if (droneId) {
      await loadHistoryAction(droneId, start, stop);
    }
  };

  return { latestSnapshot, history, connected, loadHistory };
}
