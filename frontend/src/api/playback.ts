import { apiClient } from "@/api/client";
import type { TelemetryPoint } from "@/types";

interface MissionTelemetry {
  points: TelemetryPoint[];
  startedAt: Date;
  endedAt: Date;
}

export async function fetchMissionTelemetry(
  droneId: string,
  start: Date,
  end: Date,
): Promise<MissionTelemetry> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const response = await apiClient.get<TelemetryPoint[]>("/telemetry/history", {
    params: {
      drone_id: droneId,
      start: startIso,
      stop: endIso,
    },
  });
  return {
    points: response.data,
    startedAt: start,
    endedAt: end,
  };
}
