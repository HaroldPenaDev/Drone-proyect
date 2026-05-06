import { apiClient } from "@/api/client";
import type { Drone, DroneCreate, DroneUpdate } from "@/types";

export async function fetchDrones(): Promise<Drone[]> {
  const response = await apiClient.get<Drone[]>("/drones");
  return response.data;
}

export async function fetchDrone(droneId: string): Promise<Drone> {
  const response = await apiClient.get<Drone>(`/drones/${droneId}`);
  return response.data;
}

export async function createDrone(data: DroneCreate): Promise<Drone> {
  const response = await apiClient.post<Drone>("/drones", data);
  return response.data;
}

export async function updateDrone(
  droneId: string,
  data: DroneUpdate
): Promise<Drone> {
  const response = await apiClient.put<Drone>(`/drones/${droneId}`, data);
  return response.data;
}

export async function deleteDrone(droneId: string): Promise<void> {
  await apiClient.delete(`/drones/${droneId}`);
}
