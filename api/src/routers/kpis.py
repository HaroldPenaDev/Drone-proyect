import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from influxdb_client.client.query_api import QueryApi
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import ApiSettings
from src.dependencies import get_db_session, get_influx_query_api
from src.models.mission import Mission, MissionStatus
from src.schemas.telemetry_schema import DroneKpis

router = APIRouter(prefix="/kpis", tags=["kpis"])

_settings = ApiSettings()


@router.get("/{drone_id}", response_model=DroneKpis)
async def get_drone_kpis(
    drone_id: str,
    session: AsyncSession = Depends(get_db_session),
    query_api: QueryApi = Depends(get_influx_query_api),
) -> DroneKpis:
    missions_completed = await _count_completed_missions(session, drone_id)
    total_cycles, worst_sf, max_deg = _query_influx_kpis(query_api, drone_id)

    # Get duration of the most recent mission
    flight_time_seconds = 0.0
    try:
        drone_uuid = uuid.UUID(drone_id)
        stmt = (
            select(Mission)
            .where(Mission.drone_id == drone_uuid)
            .order_by(Mission.created_at.desc())
            .limit(1)
        )
        result = await session.execute(stmt)
        latest_mission = result.scalar_one_or_none()
        
        if latest_mission and latest_mission.started_at:
            end_time = latest_mission.ended_at or datetime.now(timezone.utc)
            flight_time_seconds = max(0.0, (end_time - latest_mission.started_at).total_seconds())
    except ValueError:
        pass

    return DroneKpis(
        drone_id=drone_id,
        flight_time_seconds=flight_time_seconds,
        missions_completed=missions_completed,
        worst_safety_factor=worst_sf,
        total_cycles=total_cycles,
        max_degradation=max_deg,
    )


async def _count_completed_missions(session: AsyncSession, drone_id: str) -> int:
    try:
        drone_uuid = uuid.UUID(drone_id)
    except ValueError:
        return 0
    stmt = (
        select(func.count(Mission.id))
        .where(Mission.drone_id == drone_uuid)
        .where(Mission.status == MissionStatus.completed)
    )
    result = await session.execute(stmt)
    return int(result.scalar() or 0)


def _query_influx_kpis(
    query_api: QueryApi,
    drone_id: str,
) -> tuple[int, float, float]:
    total_points: int = 0
    worst_sf: float = 10.0
    max_deg: float = 0.0

    query_min_sf = (
        f'from(bucket: "{_settings.influxdb_bucket}")'
        f" |> range(start: 0)"
        f' |> filter(fn: (r) => r._measurement == "arm_telemetry" and r.drone_id == "{drone_id}")'
        f' |> filter(fn: (r) => r._field == "safety_factor")'
        f" |> min()"
    )
    for table in query_api.query(query_min_sf, org=_settings.influxdb_org):
        for record in table.records:
            worst_sf = min(worst_sf, float(record.get_value()))

    query_max_deg = (
        f'from(bucket: "{_settings.influxdb_bucket}")'
        f" |> range(start: 0)"
        f' |> filter(fn: (r) => r._measurement == "arm_telemetry" and r.drone_id == "{drone_id}")'
        f' |> filter(fn: (r) => r._field == "degradation_factor")'
        f" |> max()"
    )
    for table in query_api.query(query_max_deg, org=_settings.influxdb_org):
        for record in table.records:
            max_deg = max(max_deg, float(record.get_value()))

    query_count = (
        f'from(bucket: "{_settings.influxdb_bucket}")'
        f" |> range(start: 0)"
        f' |> filter(fn: (r) => r._measurement == "arm_telemetry" and r.drone_id == "{drone_id}")'
        f' |> filter(fn: (r) => r._field == "thrust" and r.arm_index == "0")'
        f" |> count()"
    )
    for table in query_api.query(query_count, org=_settings.influxdb_org):
        for record in table.records:
            total_points = int(record.get_value())

    return total_points, worst_sf, max_deg
