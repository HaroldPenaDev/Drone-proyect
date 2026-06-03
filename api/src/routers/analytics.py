import uuid

from fastapi import APIRouter, Depends
from influxdb_client.client.query_api import QueryApi
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import ApiSettings
from src.core.exceptions import NotFoundError
from src.dependencies import get_db_session, get_influx_query_api
from src.schemas.analytics_schema import (
    ComparisonRequest,
    ComparisonResponse,
    MissionAnalytics,
)
from src.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])

_settings = ApiSettings()


@router.get("/missions/{mission_id}", response_model=MissionAnalytics)
async def get_mission_analytics(
    mission_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    query_api: QueryApi = Depends(get_influx_query_api),
) -> MissionAnalytics:
    result = await analytics_service.analyze_mission(
        session, query_api, _settings, mission_id
    )
    if result is None:
        raise NotFoundError("Mission", str(mission_id))
    return result


@router.post("/compare", response_model=ComparisonResponse)
async def compare_missions(
    payload: ComparisonRequest,
    session: AsyncSession = Depends(get_db_session),
    query_api: QueryApi = Depends(get_influx_query_api),
) -> ComparisonResponse:
    results: list[MissionAnalytics] = []
    for mission_id in payload.mission_ids:
        analysis = await analytics_service.analyze_mission(
            session, query_api, _settings, mission_id
        )
        if analysis is not None:
            results.append(analysis)
    return ComparisonResponse(missions=results)
