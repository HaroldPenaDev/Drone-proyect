import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session
from src.schemas.mission_schema import MissionCreate, MissionRead
from src.services import mission_service
from src.core.exceptions import NotFoundError, BadRequestError

router = APIRouter(prefix="/missions", tags=["missions"])


@router.get("", response_model=list[MissionRead])
async def list_all_missions(
    drone_id: uuid.UUID | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> list[MissionRead]:
    missions = await mission_service.list_missions(session, drone_id)
    return [MissionRead.model_validate(m) for m in missions]


@router.get("/{mission_id}", response_model=MissionRead)
async def get_mission_by_id(
    mission_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> MissionRead:
    mission = await mission_service.get_mission(session, mission_id)
    if mission is None:
        raise NotFoundError("Mission", str(mission_id))
    return MissionRead.model_validate(mission)


@router.post("", response_model=MissionRead, status_code=201)
async def create_new_mission(
    data: MissionCreate,
    session: AsyncSession = Depends(get_db_session),
) -> MissionRead:
    mission = await mission_service.create_mission(session, data)
    return MissionRead.model_validate(mission)


@router.patch("/{mission_id}/start", response_model=MissionRead)
async def start_existing_mission(
    mission_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> MissionRead:
    mission = await mission_service.get_mission(session, mission_id)
    if mission is None:
        raise NotFoundError("Mission", str(mission_id))
    if mission.status != "pending":
        raise BadRequestError(f"Mission status is '{mission.status}', expected 'pending'")
    started = await mission_service.start_mission(session, mission)
    return MissionRead.model_validate(started)


@router.patch("/{mission_id}/stop", response_model=MissionRead)
async def stop_running_mission(
    mission_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> MissionRead:
    mission = await mission_service.get_mission(session, mission_id)
    if mission is None:
        raise NotFoundError("Mission", str(mission_id))
    if mission.status != "running":
        raise BadRequestError(f"Mission status is '{mission.status}', expected 'running'")
    stopped = await mission_service.stop_mission(session, mission)
    return MissionRead.model_validate(stopped)
