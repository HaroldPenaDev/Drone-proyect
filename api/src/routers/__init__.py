from src.routers.drones import router as drones_router
from src.routers.missions import router as missions_router
from src.routers.telemetry import router as telemetry_router
from src.routers.alerts import router as alerts_router
from src.routers.websocket import router as websocket_router

__all__ = [
    "drones_router",
    "missions_router",
    "telemetry_router",
    "alerts_router",
    "websocket_router",
]
