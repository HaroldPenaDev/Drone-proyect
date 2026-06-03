from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ArmAnalytics(BaseModel):
    arm_index: int
    avg_thrust: float
    max_thrust: float
    avg_torque: float
    max_torque: float
    min_safety_factor: float
    avg_safety_factor: float
    start_degradation: float
    end_degradation: float
    degradation_delta: float


class TelemetrySample(BaseModel):
    t_seconds: float
    avg_thrust: float
    min_safety_factor: float
    max_degradation: float


class MissionAnalytics(BaseModel):
    mission_id: UUID
    drone_id: UUID
    status: str
    movements: list[str]
    started_at: datetime | None
    ended_at: datetime | None
    duration_seconds: float
    data_points: int
    overall_avg_thrust: float
    overall_peak_thrust: float
    worst_safety_factor: float
    avg_safety_factor: float
    total_degradation_delta: float
    arms: list[ArmAnalytics]
    timeseries: list[TelemetrySample]


class ComparisonRequest(BaseModel):
    mission_ids: list[UUID]


class ComparisonResponse(BaseModel):
    missions: list[MissionAnalytics]
