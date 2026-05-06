import asyncio
import logging
import json
import asyncpg
from typing import Optional, List
from src.config import SimulatorSettings

logger = logging.getLogger(__name__)

class PostgresReader:
    def __init__(self, settings: SimulatorSettings):
        self.settings = settings
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        if not self._pool:
            dsn = f"postgres://{self.settings.postgres_user}:{self.settings.postgres_password}@{self.settings.postgres_host}:{self.settings.postgres_port}/{self.settings.postgres_db}"
            self._pool = await asyncpg.create_pool(dsn)
            logger.info("Connected to Postgres")

    async def get_drone_id_by_name(self, name: str) -> Optional[str]:
        if not self._pool:
            await self.connect()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT id FROM drones WHERE name = $1", name)
            if row:
                return str(row["id"])
        return None

    async def get_active_mission(self, drone_uuid: str) -> Optional[dict]:
        if not self._pool:
            await self.connect()
        
        async with self._pool.acquire() as conn:
            # Look for a mission with status 'running' for this drone
            row = await conn.fetchrow(
                "SELECT id, movements FROM missions WHERE drone_id = $1 AND status = 'running' LIMIT 1",
                drone_uuid
            )
            if row:
                return {
                    "id": row["id"],
                    "movements": json.loads(row["movements"]) if isinstance(row["movements"], str) else row["movements"]
                }
        return None

    async def complete_mission(self, mission_id: str):
        if not self._pool:
            await self.connect()
        
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE missions SET status = 'completed', ended_at = NOW() WHERE id = $1",
                mission_id
            )
            logger.info("Mission %s marked as completed", mission_id)

    async def close(self):
        if self._pool:
            await self._pool.close()
            logger.info("Postgres connection closed")
