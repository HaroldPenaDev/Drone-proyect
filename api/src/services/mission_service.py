import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.mission import Mission, MissionStatus
from src.schemas.mission_schema import MissionCreate


async def list_missions(
    session: AsyncSession, drone_id: uuid.UUID | None = None
) -> list[Mission]:
    query = select(Mission).order_by(Mission.created_at.desc())
    if drone_id is not None:
        query = query.where(Mission.drone_id == drone_id)
    result = await session.execute(query)
    return list(result.scalars().all())


async def get_mission(session: AsyncSession, mission_id: uuid.UUID) -> Mission | None:
    return await session.get(Mission, mission_id)


async def create_mission(session: AsyncSession, data: MissionCreate) -> Mission:
    mission = Mission(
        drone_id=data.drone_id,
        movements=data.movements,
        status=MissionStatus.PENDING,
    )
    session.add(mission)
    await session.commit()
    await session.refresh(mission)
    return mission


async def start_mission(session: AsyncSession, mission: Mission) -> Mission:
    mission.status = MissionStatus.RUNNING
    mission.started_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(mission)
    return mission


async def stop_mission(session: AsyncSession, mission: Mission) -> Mission:
    mission.status = MissionStatus.ABORTED
    mission.ended_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(mission)
    return mission


async def complete_mission(session: AsyncSession, mission: Mission) -> Mission:
    mission.status = MissionStatus.COMPLETED
    mission.ended_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(mission)
    return mission
