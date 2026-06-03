import { apiClient } from "@/api/client";
import type { DronePrediction } from "@/types";

export async function fetchPrediction(
  droneId: string,
): Promise<DronePrediction> {
  const response = await apiClient.get<DronePrediction>(
    `/predictive/${droneId}`,
  );
  return response.data;
}
