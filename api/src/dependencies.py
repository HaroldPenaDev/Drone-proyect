from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from influxdb_client.client.query_api import QueryApi

from src.db.postgres import get_session_factory
from src.db.influxdb import get_query_api


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    factory = get_session_factory()
    async with factory() as session:
        yield session


def get_influx_query_api() -> QueryApi:
    return get_query_api()
