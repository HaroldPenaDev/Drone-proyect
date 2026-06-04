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
    rpm: float = 0.0
    safety_factor: float
    degradation_factor: float


class DroneSnapshotRead(BaseModel):
    drone_id: str
    timestamp: datetime
    arms: list[DroneSnapshotArm]
    altitude: float = 0.0
    roll: float = 0.0
    pitch: float = 0.0
    yaw: float = 0.0


class DroneKpis(BaseModel):
    drone_id: str
    flight_time_seconds: float
    missions_completed: int
    worst_safety_factor: float
    total_cycles: int
    max_degradation: float
