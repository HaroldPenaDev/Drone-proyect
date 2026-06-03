from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PairedSample(BaseModel):
    t_seconds: float
    real_thrust: float | None
    sim_thrust: float | None
    real_safety_factor: float | None
    sim_safety_factor: float | None
    real_degradation: float | None
    sim_degradation: float | None


class ValidationDeltas(BaseModel):
    thrust_mae: float
    thrust_rmse: float
    thrust_correlation: float
    safety_factor_mae: float
    safety_factor_rmse: float
    degradation_mae: float
    overall_score: float  # 0..100
    verdict: str


class ValidationResponse(BaseModel):
    real_mission_id: UUID
    sim_mission_id: UUID
    real_started_at: datetime | None
    sim_started_at: datetime | None
    real_duration_seconds: float
    sim_duration_seconds: float
    samples: list[PairedSample]
    deltas: ValidationDeltas


class SuggestedPair(BaseModel):
    real_mission_id: UUID
    sim_mission_id: UUID
    similarity_score: float
