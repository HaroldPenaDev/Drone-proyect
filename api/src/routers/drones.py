import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session
from src.schemas.drone_schema import DroneCreate, DroneUpdate, DroneRead
from src.services import drone_service
from src.core.exceptions import NotFoundError

router = APIRouter(prefix="/drones", tags=["drones"])


@router.get("", response_model=list[DroneRead])
async def list_all_drones(
    session: AsyncSession = Depends(get_db_session),
) -> list[DroneRead]:
    drones = await drone_service.list_drones(session)
    return [DroneRead.model_validate(d) for d in drones]


@router.get("/{drone_id}", response_model=DroneRead)
async def get_drone_by_id(
    drone_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> DroneRead:
    drone = await drone_service.get_drone(session, drone_id)
    if drone is None:
        raise NotFoundError("Drone", str(drone_id))
    return DroneRead.model_validate(drone)


@router.post("", response_model=DroneRead, status_code=201)
async def create_new_drone(
    data: DroneCreate,
    session: AsyncSession = Depends(get_db_session),
) -> DroneRead:
    drone = await drone_service.create_drone(session, data)
    return DroneRead.model_validate(drone)


@router.put("/{drone_id}", response_model=DroneRead)
async def update_existing_drone(
    drone_id: uuid.UUID,
    data: DroneUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> DroneRead:
    drone = await drone_service.get_drone(session, drone_id)
    if drone is None:
        raise NotFoundError("Drone", str(drone_id))
    updated = await drone_service.update_drone(session, drone, data)
    return DroneRead.model_validate(updated)


@router.delete("/{drone_id}", status_code=204)
async def remove_drone(
    drone_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    drone = await drone_service.get_drone(session, drone_id)
    if drone is None:
        raise NotFoundError("Drone", str(drone_id))
    await drone_service.delete_drone(session, drone_id)
