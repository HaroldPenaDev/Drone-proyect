from influxdb_client import InfluxDBClient
from influxdb_client.client.query_api import QueryApi

from src.config import ApiSettings

_client: InfluxDBClient | None = None


def init_influx(settings: ApiSettings) -> InfluxDBClient:
    global _client
    _client = InfluxDBClient(
        url=settings.influxdb_url,
        token=settings.influxdb_token,
        org=settings.influxdb_org,
    )
    return _client


def get_influx_client() -> InfluxDBClient:
    if _client is None:
        raise RuntimeError("InfluxDB client not initialized")
    return _client


def get_query_api() -> QueryApi:
    return get_influx_client().query_api()


def close_influx() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
