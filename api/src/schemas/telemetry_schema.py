from datetime import datetime

from pydantic import BaseModel


class TelemetryPoint(BaseModel):
    timestamp: datetime
    arm_index: int
    thrust: float
    torque: float
    safety_factor: float
    degradation_factor: float


class TelemetryQuery(BaseModel):
    drone_id: str
    start: str = "-1h"
    stop: str = "now()"
    arm_index: int | None = None


class DroneSnapshotArm(BaseModel):
    arm_index: int
    thrust: float
    torque: float
    safety_factor: float
    degradation_factor: float


class DroneSnapshotRead(BaseModel):
    drone_id: str
    timestamp: datetime
    arms: list[DroneSnapshotArm]
