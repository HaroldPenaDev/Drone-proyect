import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from influxdb_client.client.query_api import QueryApi

from src.config import ApiSettings
from src.db.influxdb import get_query_api
from src.services.telemetry_service import query_latest_snapshot

router = APIRouter()
logger = logging.getLogger(__name__)

_active_connections: dict[str, list[WebSocket]] = {}
_settings = ApiSettings()


async def _broadcast_loop(drone_id: str) -> None:
    while drone_id in _active_connections and _active_connections[drone_id]:
        try:
            query_api: QueryApi = get_query_api()
            snapshot = query_latest_snapshot(query_api, _settings, drone_id)
            payload: str = snapshot.model_dump_json()
            disconnected: list[WebSocket] = []
            for ws in _active_connections.get(drone_id, []):
                try:
                    await ws.send_text(payload)
                except Exception:
                    disconnected.append(ws)
            for ws in disconnected:
                if drone_id in _active_connections:
                    _active_connections[drone_id].remove(ws)
        except Exception as exc:
            logger.warning("Broadcast error for %s: %s", drone_id, exc)
        await asyncio.sleep(0.5)


@router.websocket("/ws/telemetry/{drone_id}")
async def telemetry_websocket(websocket: WebSocket, drone_id: str) -> None:
    await websocket.accept()
    if drone_id not in _active_connections:
        _active_connections[drone_id] = []
    _active_connections[drone_id].append(websocket)

    start_broadcast: bool = len(_active_connections[drone_id]) == 1
    if start_broadcast:
        asyncio.create_task(_broadcast_loop(drone_id))

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if drone_id in _active_connections:
            _active_connections[drone_id].remove(websocket)
            if not _active_connections[drone_id]:
                del _active_connections[drone_id]
