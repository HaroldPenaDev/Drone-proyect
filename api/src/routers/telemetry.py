from fastapi import APIRouter, Depends, Query
from influxdb_client.client.query_api import QueryApi

from src.config import ApiSettings
from src.dependencies import get_influx_query_api
from src.schemas.telemetry_schema import TelemetryPoint, DroneSnapshotRead
from src.services.telemetry_service import query_telemetry_history, query_latest_snapshot

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

_settings = ApiSettings()


@router.get("/latest/{drone_id}", response_model=DroneSnapshotRead)
def get_latest_telemetry(
    drone_id: str,
    query_api: QueryApi = Depends(get_influx_query_api),
) -> DroneSnapshotRead:
    return query_latest_snapshot(query_api, _settings, drone_id)


@router.get("/history", response_model=list[TelemetryPoint])
def get_telemetry_history(
    drone_id: str = Query(...),
    start: str = Query(default="-1h"),
    stop: str = Query(default="now()"),
    arm_index: int | None = Query(default=None),
    query_api: QueryApi = Depends(get_influx_query_api),
) -> list[TelemetryPoint]:
    return query_telemetry_history(
        query_api, _settings, drone_id, start, stop, arm_index
    )
