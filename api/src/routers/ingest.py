import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import ApiSettings
from src.core.exceptions import BadRequestError
from src.dependencies import get_db_session
from src.schemas.ingest_schema import IngestSummary
from src.services import ingest_service

router = APIRouter(prefix="/ingest", tags=["ingest"])

_settings = ApiSettings()

_TEMPLATE_CSV = """timestamp,thrust_0,thrust_1,thrust_2,thrust_3,altitude,roll,pitch,yaw
2026-01-15T10:00:00Z,2.94,2.94,2.94,2.94,0.0,0.0,0.0,0.0
2026-01-15T10:00:00.5Z,3.10,3.05,3.10,3.05,0.5,0.01,0.00,0.0
2026-01-15T10:00:01Z,3.20,3.18,3.22,3.20,1.2,0.00,0.01,0.0
2026-01-15T10:00:01.5Z,3.18,3.18,3.18,3.18,1.5,0.00,0.00,0.0
2026-01-15T10:00:02Z,3.15,3.16,3.14,3.15,1.5,0.00,0.00,0.0
"""


@router.get("/template", response_class=PlainTextResponse)
async def download_template() -> str:
    return _TEMPLATE_CSV


@router.post("/flight", response_model=IngestSummary)
async def ingest_flight(
    drone_id: uuid.UUID = Form(...),
    label: str | None = Form(default=None),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
) -> IngestSummary:
    raw = await file.read()
    if not raw:
        raise BadRequestError("Uploaded file is empty")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise BadRequestError("File must be UTF-8 encoded text/CSV") from exc

    return await ingest_service.ingest_flight_csv(
        session=session,
        bucket_name=_settings.influxdb_bucket,
        org=_settings.influxdb_org,
        drone_id=drone_id,
        csv_text=text,
        label=label,
    )
