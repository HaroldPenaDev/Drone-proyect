from pydantic_settings import BaseSettings, SettingsConfigDict


class SimulatorSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    influxdb_url: str = "http://influxdb:8086"
    influxdb_token: str = "dev-token"
    influxdb_org: str = "drone-lab"
    influxdb_bucket: str = "drone_telemetry"

    simulator_interval_ms: int = 500
    simulator_drone_id: str = "stmu-quad-001"
