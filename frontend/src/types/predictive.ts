export type HealthStatus = "healthy" | "watch" | "critical" | "stable";

export interface ArmPrediction {
  arm_index: number;
  current_degradation: number;
  current_safety_factor: number;
  degradation_rate_per_hour: number;
  hours_until_critical: number | null;
  cycles_until_critical: number | null;
  health_status: HealthStatus;
  confidence: number;
}

export interface DronePrediction {
  drone_id: string;
  samples_analyzed: number;
  horizon_hours: number;
  arms: ArmPrediction[];
  overall_health: string;
  next_inspection_recommended_hours: number | null;
}
