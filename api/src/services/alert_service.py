import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.alert import Alert
from src.schemas.telemetry_schema import DroneSnapshotRead


async def list_alerts(
    session: AsyncSession, drone_id: uuid.UUID | None = None
) -> list[Alert]:
    query = select(Alert).order_by(Alert.created_at.desc()).limit(100)
    if drone_id is not None:
        query = query.where(Alert.drone_id == drone_id)
    result = await session.execute(query)
    return list(result.scalars().all())


async def check_and_create_alerts(
    session: AsyncSession,
    drone_id: uuid.UUID,
    snapshot: DroneSnapshotRead,
    threshold: float,
    mission_id: uuid.UUID | None = None,
) -> list[Alert]:
    created_alerts: list[Alert] = []
    for arm in snapshot.arms:
        if arm.safety_factor < threshold:
            alert = Alert(
                drone_id=drone_id,
                mission_id=mission_id,
                alert_type="low_safety_factor",
                arm_index=arm.arm_index,
                safety_factor_value=arm.safety_factor,
                threshold=threshold,
            )
            session.add(alert)
            created_alerts.append(alert)
    if created_alerts:
        await session.commit()
    return created_alerts
