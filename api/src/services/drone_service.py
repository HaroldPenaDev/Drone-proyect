import uuid

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.drone import Drone
from src.schemas.drone_schema import DroneCreate, DroneUpdate


async def list_drones(session: AsyncSession) -> list[Drone]:
    result = await session.execute(select(Drone).order_by(Drone.created_at.desc()))
    return list(result.scalars().all())


async def get_drone(session: AsyncSession, drone_id: uuid.UUID) -> Drone | None:
    return await session.get(Drone, drone_id)


async def create_drone(session: AsyncSession, data: DroneCreate) -> Drone:
    drone = Drone(
        name=data.name,
        mass_kg=data.mass_kg,
        arm_length_m=data.arm_length_m,
    )
    session.add(drone)
    await session.commit()
    await session.refresh(drone)
    return drone


async def update_drone(
    session: AsyncSession, drone: Drone, data: DroneUpdate
) -> Drone:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(drone, field, value)
    await session.commit()
    await session.refresh(drone)
    return drone


async def delete_drone(session: AsyncSession, drone_id: uuid.UUID) -> None:
    await session.execute(delete(Drone).where(Drone.id == drone_id))
    await session.commit()
