from pydantic_settings import BaseSettings, SettingsConfigDict


class SimulatorSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    influxdb_url: str = "http://influxdb:8086"
    influxdb_token: str = "dev-token"
    influxdb_org: str = "drone-lab"
    influxdb_bucket: str = "drone_telemetry"

    simulator_interval_ms: int = 500
    simulator_drone_id: str = "stmu-quad-001"

    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_db: str = "drone_twin"
    postgres_user: str = "drone"
    postgres_password: str = "drone_dev"

    mission_cycles_per_movement: int = 10
