from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import ApiSettings
from src.db.postgres import init_engine, close_engine
from src.db.influxdb import init_influx, close_influx
from src.routers import (
    drones_router,
    missions_router,
    telemetry_router,
    alerts_router,
    websocket_router,
)

settings = ApiSettings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    init_engine(settings)
    init_influx(settings)
    yield
    await close_engine()
    close_influx()


app = FastAPI(
    title="Drone Digital Twin API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(drones_router)
app.include_router(missions_router)
app.include_router(telemetry_router)
app.include_router(alerts_router)
app.include_router(websocket_router)
