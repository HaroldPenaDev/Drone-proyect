export interface Drone {
  id: string;
  name: string;
  arm_count: number;
  mass_kg: number;
  arm_length_m: number;
  created_at: string;
  updated_at: string;
}

export interface DroneCreate {
  name: string;
  mass_kg: number;
  arm_length_m: number;
}

export interface DroneUpdate {
  name?: string;
  mass_kg?: number;
  arm_length_m?: number;
}
