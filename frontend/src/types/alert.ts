export interface Alert {
  id: string;
  drone_id: string;
  mission_id: string | null;
  alert_type: string;
  arm_index: number;
  safety_factor_value: number;
  threshold: number;
  created_at: string;
}
