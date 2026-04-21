export interface TelemetryPoint {
  timestamp: string;
  arm_index: number;
  thrust: number;
  torque: number;
  safety_factor: number;
  degradation_factor: number;
}

export interface ArmSnapshot {
  arm_index: number;
  thrust: number;
  torque: number;
  safety_factor: number;
  degradation_factor: number;
  rpm: number;
}

export interface DronePosition {
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
}

export interface DroneSnapshot {
  drone_id: string;
  timestamp: string;
  arms: [ArmSnapshot, ArmSnapshot, ArmSnapshot, ArmSnapshot];
  position: DronePosition;
  current_movement: string;
}

export interface DroneKpis {
  drone_id: string;
  flight_time_seconds: number;
  missions_completed: number;
  worst_safety_factor: number;
  total_cycles: number;
  max_degradation: number;
}
