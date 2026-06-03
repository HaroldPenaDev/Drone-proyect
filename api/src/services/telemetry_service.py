from datetime import datetime, timezone

from influxdb_client.client.query_api import QueryApi

from src.config import ApiSettings
from src.schemas.telemetry_schema import (
    TelemetryPoint,
    DroneSnapshotArm,
    DroneSnapshotRead,
)


def _build_history_query(
    bucket: str,
    drone_id: str,
    start: str,
    stop: str,
    arm_index: int | None,
) -> str:
    base = (
        f'from(bucket: "{bucket}")'
        f" |> range(start: {start}, stop: {stop})"
        f' |> filter(fn: (r) => r._measurement == "arm_telemetry")'
        f' |> filter(fn: (r) => r.drone_id == "{drone_id}")'
    )
    if arm_index is not None:
        base += f' |> filter(fn: (r) => r.arm_index == "{arm_index}")'
    base += " |> pivot(rowKey: [\"_time\"], columnKey: [\"_field\"], valueColumn: \"_value\")"
    return base


def query_telemetry_history(
    query_api: QueryApi,
    settings: ApiSettings,
    drone_id: str,
    start: str = "-1h",
    stop: str = "now()",
    arm_index: int | None = None,
) -> list[TelemetryPoint]:
    flux_query: str = _build_history_query(
        settings.influxdb_bucket, drone_id, start, stop, arm_index
    )
    tables = query_api.query(flux_query, org=settings.influxdb_org)
    points: list[TelemetryPoint] = []
    for table in tables:
        for record in table.records:
            points.append(
                TelemetryPoint(
                    timestamp=record.get_time(),
                    arm_index=int(record.values.get("arm_index", 0)),
                    thrust=float(record.values.get("thrust", 0.0)),
                    torque=float(record.values.get("torque", 0.0)),
                    safety_factor=float(record.values.get("safety_factor", 0.0)),
                    degradation_factor=float(record.values.get("degradation_factor", 0.0)),
                )
            )
    return points


def _query_latest_position(
    query_api: QueryApi, settings: ApiSettings, drone_id: str
) -> dict[str, float]:
    flux = (
        f'from(bucket: "{settings.influxdb_bucket}")'
        f" |> range(start: -10s)"
        f' |> filter(fn: (r) => r._measurement == "drone_position")'
        f' |> filter(fn: (r) => r.drone_id == "{drone_id}")'
        f" |> last()"
        f' |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")'
    )
    out: dict[str, float] = {"altitude": 0.0, "roll": 0.0, "pitch": 0.0, "yaw": 0.0}
    try:
        tables = query_api.query(flux, org=settings.influxdb_org)
        for table in tables:
            for record in table.records:
                out["altitude"] = float(record.values.get("z", 0.0) or 0.0)
                out["roll"] = float(record.values.get("roll", 0.0) or 0.0)
                out["pitch"] = float(record.values.get("pitch", 0.0) or 0.0)
                out["yaw"] = float(record.values.get("yaw", 0.0) or 0.0)
    except Exception:
        pass
    return out


def query_latest_snapshot(
    query_api: QueryApi,
    settings: ApiSettings,
    drone_id: str,
) -> DroneSnapshotRead:
    flux_query: str = (
        f'from(bucket: "{settings.influxdb_bucket}")'
        f" |> range(start: -10s)"
        f' |> filter(fn: (r) => r._measurement == "arm_telemetry")'
        f' |> filter(fn: (r) => r.drone_id == "{drone_id}")'
        f" |> last()"
        f' |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")'
    )
    tables = query_api.query(flux_query, org=settings.influxdb_org)
    arms: list[DroneSnapshotArm] = []
    latest_time: datetime = datetime.now(timezone.utc)
    for table in tables:
        for record in table.records:
            latest_time = record.get_time()
            arms.append(
                DroneSnapshotArm(
                    arm_index=int(record.values.get("arm_index", 0)),
                    thrust=float(record.values.get("thrust", 0.0)),
                    torque=float(record.values.get("torque", 0.0)),
                    safety_factor=float(record.values.get("safety_factor", 10.0)),
                    degradation_factor=float(record.values.get("degradation_factor", 0.0)),
                )
            )
    while len(arms) < 4:
        arms.append(DroneSnapshotArm(
            arm_index=len(arms), thrust=0.0, torque=0.0,
            safety_factor=10.0, degradation_factor=0.0,
        ))
    arms.sort(key=lambda a: a.arm_index)

    pos = _query_latest_position(query_api, settings, drone_id)

    return DroneSnapshotRead(
        drone_id=drone_id,
        timestamp=latest_time,
        arms=arms[:4],
        altitude=pos["altitude"],
        roll=pos["roll"],
        pitch=pos["pitch"],
        yaw=pos["yaw"],
    )
