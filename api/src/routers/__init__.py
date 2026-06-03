from src.routers.drones import router as drones_router
from src.routers.missions import router as missions_router
from src.routers.telemetry import router as telemetry_router
from src.routers.alerts import router as alerts_router
from src.routers.websocket import router as websocket_router
from src.routers.kpis import router as kpis_router
from src.routers.analytics import router as analytics_router
from src.routers.ingest import router as ingest_router
from src.routers.predictive import router as predictive_router
from src.routers.validation import router as validation_router

__all__ = [
    "drones_router",
    "missions_router",
    "telemetry_router",
    "alerts_router",
    "websocket_router",
    "kpis_router",
    "analytics_router",
    "ingest_router",
    "predictive_router",
    "validation_router",
]
