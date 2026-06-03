from pydantic import BaseModel


class ArmPrediction(BaseModel):
    arm_index: int
    current_degradation: float
    current_safety_factor: float
    degradation_rate_per_hour: float
    hours_until_critical: float | None
    cycles_until_critical: int | None
    health_status: str  # "healthy" | "watch" | "critical" | "stable"
    confidence: float  # 0..1, R² of the linear fit


class DronePrediction(BaseModel):
    drone_id: str
    samples_analyzed: int
    horizon_hours: float
    arms: list[ArmPrediction]
    overall_health: str
    next_inspection_recommended_hours: float | None
