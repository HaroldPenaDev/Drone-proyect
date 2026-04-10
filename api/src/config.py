from pydantic_settings import BaseSettings, SettingsConfigDict


class ApiSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_db: str = "drone_twin"
    postgres_user: str = "drone"
    postgres_password: str = "drone_dev"

    influxdb_url: str = "http://influxdb:8086"
    influxdb_token: str = "dev-token"
    influxdb_org: str = "drone-lab"
    influxdb_bucket: str = "drone_telemetry"

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    safety_factor_threshold: float = 1.5

    @property
    def postgres_dsn(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )
