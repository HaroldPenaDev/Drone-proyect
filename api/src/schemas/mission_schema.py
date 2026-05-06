from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src.models.mission import MissionStatus


class MissionCreate(BaseModel):
    drone_id: UUID
    movements: list[str]


class MissionUpdate(BaseModel):
    status: MissionStatus


class MissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    drone_id: UUID
    status: MissionStatus
    movements: list[str]
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime
