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
    rpm: float = 0.0


class DronePosition(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    roll: float = 0.0
    pitch: float = 0.0
    yaw: float = 0.0


class DroneSnapshotRead(BaseModel):
    drone_id: str
    timestamp: datetime
    arms: list[DroneSnapshotArm]
    position: DronePosition = DronePosition()
    current_movement: str = "hover"


class DroneKpis(BaseModel):
    drone_id: str
    flight_time_seconds: float
    missions_completed: int
    worst_safety_factor: float
    total_cycles: int
    max_degradation: float
