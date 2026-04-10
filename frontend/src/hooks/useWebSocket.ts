import { useEffect, useRef, useCallback } from "react";
import { TelemetryWebSocket } from "@/api/websocket";
import { useTelemetryStore } from "@/stores/telemetryStore";

export function useWebSocket(droneId: string | null): boolean {
  const wsRef = useRef<TelemetryWebSocket | null>(null);
  const updateSnapshot = useTelemetryStore((s) => s.updateSnapshot);
  const setConnected = useTelemetryStore((s) => s.setConnected);
  const connected = useTelemetryStore((s) => s.connected);

  const connect = useCallback(() => {
    if (!droneId) return;

    wsRef.current?.disconnect();

    const wsUrl = `${import.meta.env.VITE_WS_URL}/telemetry/${droneId}`;
    const ws = new TelemetryWebSocket(wsUrl, updateSnapshot, setConnected);
    ws.connect();
    wsRef.current = ws;
  }, [droneId, updateSnapshot, setConnected]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, [connect]);

  return connected;
}
