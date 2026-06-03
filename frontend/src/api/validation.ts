import { apiClient } from "@/api/client";
import type {
  SuggestedPair,
  ValidationCandidates,
  ValidationResponse,
} from "@/types";

export async function fetchValidationCandidates(
  droneId: string,
): Promise<ValidationCandidates> {
  const response = await apiClient.get<ValidationCandidates>(
    `/validation/candidates/${droneId}`,
  );
  return response.data;
}

export async function suggestValidationPair(
  realMissionId: string,
): Promise<SuggestedPair | null> {
  const response = await apiClient.get<SuggestedPair | null>(
    `/validation/suggest/${realMissionId}`,
  );
  return response.data;
}

export async function compareRealVsSim(
  realMissionId: string,
  simMissionId: string,
): Promise<ValidationResponse> {
  const response = await apiClient.get<ValidationResponse>(
    "/validation/compare",
    {
      params: {
        real_mission_id: realMissionId,
        sim_mission_id: simMissionId,
      },
    },
  );
  return response.data;
}
