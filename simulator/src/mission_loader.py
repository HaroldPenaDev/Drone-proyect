import json
import logging
import uuid

import asyncpg

from src.constants.motor_specs import Movement

logger = logging.getLogger(__name__)


class MissionLoader:
    def __init__(
        self,
        dsn: str,
        drone_name: str,
        cycles_per_movement: int,
    ) -> None:
        self._dsn = dsn
        self._drone_name = drone_name
        self._cycles_per_movement = cycles_per_movement
        self._pool: asyncpg.Pool | None = None
        self._drone_id: uuid.UUID | None = None
        self._active_mission_id: uuid.UUID | None = None
        self._movements: list[str] = []
        self._movement_index: int = 0
        self._cycles_in_current: int = 0

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(self._dsn, min_size=1, max_size=2)
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM drones WHERE name = $1", self._drone_name
            )
        if row is None:
            logger.warning(
                "Drone '%s' not found in postgres yet — mission polling disabled until it is created",
                self._drone_name,
            )
            return
        self._drone_id = row["id"]
        logger.info("MissionLoader resolved drone '%s' -> %s", self._drone_name, self._drone_id)

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()

    @property
    def drone_id(self) -> uuid.UUID | None:
        return self._drone_id

    async def _resolve_drone_id_if_needed(self) -> None:
        if self._drone_id is not None or self._pool is None:
            return
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM drones WHERE name = $1", self._drone_name
            )
        if row is not None:
            self._drone_id = row["id"]
            logger.info("MissionLoader resolved drone '%s' -> %s", self._drone_name, self._drone_id)

    async def _fetch_active_mission(self) -> None:
        if self._pool is None or self._drone_id is None:
            return
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id, movements FROM missions "
                "WHERE drone_id = $1 AND status = 'running' "
                "ORDER BY started_at DESC NULLS LAST, created_at DESC LIMIT 1",
                self._drone_id,
            )
        if row is None:
            return
        raw = row["movements"]
        movements = json.loads(raw) if isinstance(raw, str) else list(raw)
        if not movements:
            await self._mark_completed(row["id"])
            return
        self._active_mission_id = row["id"]
        self._movements = [str(m) for m in movements]
        self._movement_index = 0
        self._cycles_in_current = 0
        logger.info(
            "Picked up mission %s with %d movements: %s",
            self._active_mission_id,
            len(self._movements),
            self._movements,
        )

    async def _mark_completed(self, mission_id: uuid.UUID) -> None:
        if self._pool is None:
            return
        async with self._pool.acquire() as conn:
            await conn.execute(
                "UPDATE missions SET status = 'completed', ended_at = NOW() "
                "WHERE id = $1",
                mission_id,
            )
        logger.info("Mission %s marked completed", mission_id)

    async def next_movement(self) -> Movement | None:
        await self._resolve_drone_id_if_needed()

        if self._active_mission_id is None:
            await self._fetch_active_mission()
            if self._active_mission_id is None:
                return None

        current_name = self._movements[self._movement_index]
        self._cycles_in_current += 1

        if self._cycles_in_current >= self._cycles_per_movement:
            self._cycles_in_current = 0
            self._movement_index += 1
            if self._movement_index >= len(self._movements):
                completed_id = self._active_mission_id
                self._active_mission_id = None
                self._movements = []
                self._movement_index = 0
                if completed_id is not None:
                    await self._mark_completed(completed_id)

        try:
            return Movement(current_name)
        except ValueError:
            logger.warning("Unknown movement '%s' in mission — skipping", current_name)
            return None
