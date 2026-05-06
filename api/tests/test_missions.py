from uuid import uuid4

from src.schemas.mission_schema import MissionCreate, MissionRead
from src.models.mission import MissionStatus


def test_mission_create_schema():
    data = MissionCreate(drone_id=uuid4(), movements=["hover", "ascend", "descend"])
    assert len(data.movements) == 3


def test_mission_status_values():
    assert MissionStatus.PENDING.value == "pending"
    assert MissionStatus.RUNNING.value == "running"
    assert MissionStatus.COMPLETED.value == "completed"
    assert MissionStatus.ABORTED.value == "aborted"
