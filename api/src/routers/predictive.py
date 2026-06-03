from fastapi import APIRouter, Depends
from influxdb_client.client.query_api import QueryApi

from src.config import ApiSettings
from src.dependencies import get_influx_query_api
from src.schemas.predictive_schema import DronePrediction
from src.services import predictive_service

router = APIRouter(prefix="/predictive", tags=["predictive"])

_settings = ApiSettings()


@router.get("/{drone_id}", response_model=DronePrediction)
def get_drone_prediction(
    drone_id: str,
    query_api: QueryApi = Depends(get_influx_query_api),
) -> DronePrediction:
    return predictive_service.predict_drone(query_api, _settings, drone_id)
