from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    drone_id: UUID
    mission_id: UUID | None
    alert_type: str
    arm_index: int
    safety_factor_value: float
    threshold: float
    created_at: datetime
