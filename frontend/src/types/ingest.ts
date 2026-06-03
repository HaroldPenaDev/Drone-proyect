export interface IngestSummary {
  mission_id: string;
  drone_id: string;
  rows_parsed: number;
  samples_written: number;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  detected_format: string;
  worst_safety_factor: number;
  final_degradation_per_arm: number[];
  warnings: string[];
}
