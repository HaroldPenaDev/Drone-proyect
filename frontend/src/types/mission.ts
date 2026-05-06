export type MissionStatus = "pending" | "running" | "completed" | "aborted";

export interface Mission {
  id: string;
  drone_id: string;
  status: MissionStatus;
  movements: string[];
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface MissionCreate {
  drone_id: string;
  movements: string[];
}
