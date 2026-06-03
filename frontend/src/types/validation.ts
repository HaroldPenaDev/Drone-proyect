import type { Mission } from "@/types/mission";

export interface PairedSample {
  t_seconds: number;
  real_thrust: number | null;
  sim_thrust: number | null;
  real_safety_factor: number | null;
  sim_safety_factor: number | null;
  real_degradation: number | null;
  sim_degradation: number | null;
}

export interface ValidationDeltas {
  thrust_mae: number;
  thrust_rmse: number;
  thrust_correlation: number;
  safety_factor_mae: number;
  safety_factor_rmse: number;
  degradation_mae: number;
  overall_score: number;
  verdict: string;
}

export interface ValidationResponse {
  real_mission_id: string;
  sim_mission_id: string;
  real_started_at: string | null;
  sim_started_at: string | null;
  real_duration_seconds: number;
  sim_duration_seconds: number;
  samples: PairedSample[];
  deltas: ValidationDeltas;
}

export interface SuggestedPair {
  real_mission_id: string;
  sim_mission_id: string;
  similarity_score: number;
}

export interface ValidationCandidates {
  real: Mission[];
  sim: Mission[];
}
