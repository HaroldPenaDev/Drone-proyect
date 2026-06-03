import uuid

from fastapi import APIRouter, Depends, Query
from influxdb_client.client.query_api import QueryApi
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import ApiSettings
from src.dependencies import get_db_session, get_influx_query_api
from src.schemas.mission_schema import MissionRead
from src.schemas.validation_schema import SuggestedPair, ValidationResponse
from src.services import validation_service

router = APIRouter(prefix="/validation", tags=["validation"])

_settings = ApiSettings()


@router.get("/candidates/{drone_id}")
async def list_candidates(
    drone_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, list[MissionRead]]:
    real, sim = await validation_service.list_validation_candidates(session, drone_id)
    return {
        "real": [MissionRead.model_validate(m) for m in real],
        "sim": [MissionRead.model_validate(m) for m in sim],
    }


@router.get("/suggest/{real_mission_id}", response_model=SuggestedPair | None)
async def suggest(
    real_mission_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> SuggestedPair | None:
    return await validation_service.suggest_pair(session, real_mission_id)


@router.get("/compare", response_model=ValidationResponse)
async def compare(
    real_mission_id: uuid.UUID = Query(...),
    sim_mission_id: uuid.UUID = Query(...),
    session: AsyncSession = Depends(get_db_session),
    query_api: QueryApi = Depends(get_influx_query_api),
) -> ValidationResponse:
    return await validation_service.validate_real_vs_sim(
        session, query_api, _settings, real_mission_id, sim_mission_id
    )
