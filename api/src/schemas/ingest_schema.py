from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class IngestSummary(BaseModel):
    mission_id: UUID
    drone_id: UUID
    rows_parsed: int
    samples_written: int
    started_at: datetime
    ended_at: datetime
    duration_seconds: float
    detected_format: str
    worst_safety_factor: float
    final_degradation_per_arm: list[float]
    warnings: list[str]
