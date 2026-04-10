import { apiClient } from "@/api/client";
import type { TelemetryPoint, DroneSnapshot } from "@/types";

export async function fetchLatestTelemetry(
  droneId: string
): Promise<DroneSnapshot> {
  const response = await apiClient.get<DroneSnapshot>(
    `/telemetry/latest/${droneId}`
  );
  return response.data;
}

export async function fetchTelemetryHistory(
  droneId: string,
  start: string = "-1h",
  stop: string = "now()",
  armIndex?: number
): Promise<TelemetryPoint[]> {
  const params: Record<string, string | number> = {
    drone_id: droneId,
    start,
    stop,
  };
  if (armIndex !== undefined) {
    params.arm_index = armIndex;
  }
  const response = await apiClient.get<TelemetryPoint[]>("/telemetry/history", {
    params,
  });
  return response.data;
}
