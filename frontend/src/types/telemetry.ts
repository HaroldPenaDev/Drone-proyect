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
}

export interface DroneSnapshot {
  drone_id: string;
  timestamp: string;
  arms: [ArmSnapshot, ArmSnapshot, ArmSnapshot, ArmSnapshot];
}
