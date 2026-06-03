export interface ArmAnalytics {
  arm_index: number;
  avg_thrust: number;
  max_thrust: number;
  avg_torque: number;
  max_torque: number;
  min_safety_factor: number;
  avg_safety_factor: number;
  start_degradation: number;
  end_degradation: number;
  degradation_delta: number;
}

export interface TelemetrySample {
  t_seconds: number;
  avg_thrust: number;
  min_safety_factor: number;
  max_degradation: number;
}

export interface MissionAnalytics {
  mission_id: string;
  drone_id: string;
  status: string;
  movements: string[];
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  data_points: number;
  overall_avg_thrust: number;
  overall_peak_thrust: number;
  worst_safety_factor: number;
  avg_safety_factor: number;
  total_degradation_delta: number;
  arms: ArmAnalytics[];
  timeseries: TelemetrySample[];
}

export interface ComparisonResponse {
  missions: MissionAnalytics[];
}
