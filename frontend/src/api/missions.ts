import { apiClient } from "@/api/client";
import type { Mission, MissionCreate } from "@/types";

export async function fetchMissions(droneId?: string): Promise<Mission[]> {
  const params = droneId ? { drone_id: droneId } : {};
  const response = await apiClient.get<Mission[]>("/missions", { params });
  return response.data;
}

export async function fetchMission(missionId: string): Promise<Mission> {
  const response = await apiClient.get<Mission>(`/missions/${missionId}`);
  return response.data;
}

export async function createMission(data: MissionCreate): Promise<Mission> {
  const response = await apiClient.post<Mission>("/missions", data);
  return response.data;
}

export async function startMission(missionId: string): Promise<Mission> {
  const response = await apiClient.patch<Mission>(`/missions/${missionId}/start`);
  return response.data;
}

export async function stopMission(missionId: string): Promise<Mission> {
  const response = await apiClient.patch<Mission>(`/missions/${missionId}/stop`);
  return response.data;
}
