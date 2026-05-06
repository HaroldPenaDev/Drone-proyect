import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_db_session
from src.schemas.alert_schema import AlertRead
from src.services.alert_service import list_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertRead])
async def get_all_alerts(
    drone_id: uuid.UUID | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> list[AlertRead]:
    alerts = await list_alerts(session, drone_id)
    return [AlertRead.model_validate(a) for a in alerts]
