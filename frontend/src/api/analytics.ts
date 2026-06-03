import { apiClient } from "@/api/client";
import type { ComparisonResponse, MissionAnalytics } from "@/types";

export async function fetchMissionAnalytics(
  missionId: string,
): Promise<MissionAnalytics> {
  const response = await apiClient.get<MissionAnalytics>(
    `/analytics/missions/${missionId}`,
  );
  return response.data;
}

export async function compareMissions(
  missionIds: string[],
): Promise<ComparisonResponse> {
  const response = await apiClient.post<ComparisonResponse>(
    "/analytics/compare",
    { mission_ids: missionIds },
  );
  return response.data;
}
