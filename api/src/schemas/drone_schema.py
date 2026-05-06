from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DroneCreate(BaseModel):
    name: str
    mass_kg: float
    arm_length_m: float


class DroneUpdate(BaseModel):
    name: str | None = None
    mass_kg: float | None = None
    arm_length_m: float | None = None


class DroneRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    arm_count: int
    mass_kg: float
    arm_length_m: float
    created_at: datetime
    updated_at: datetime
