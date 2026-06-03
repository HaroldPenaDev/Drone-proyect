import csv
import io
import uuid
from datetime import datetime, timezone

from influxdb_client import Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from sqlalchemy.ext.asyncio import AsyncSession

from src.core import physics
from src.core.exceptions import BadRequestError
from src.db.influxdb import get_influx_client
from src.models.drone import Drone
from src.models.mission import Mission, MissionStatus
from src.schemas.ingest_schema import IngestSummary


_REQUIRED_TIMESTAMP_HEADERS = {"timestamp", "time", "t", "epoch"}
_WIDE_THRUST_HEADERS = ["thrust_0", "thrust_1", "thrust_2", "thrust_3"]
_LONG_HEADERS = {"arm_index", "thrust"}


def _parse_timestamp(raw: str) -> datetime:
    raw = raw.strip()
    if not raw:
        raise BadRequestError("Empty timestamp value")
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        pass
    try:
        epoch = float(raw)
        return datetime.fromtimestamp(epoch, tz=timezone.utc)
    except ValueError as exc:
        raise BadRequestError(f"Unrecognized timestamp format: {raw!r}") from exc


def _detect_format(headers: list[str]) -> str:
    lower = {h.strip().lower() for h in headers}
    if not (lower & _REQUIRED_TIMESTAMP_HEADERS):
        raise BadRequestError(
            "CSV must contain a timestamp column (timestamp/time/t/epoch)"
        )
    if _LONG_HEADERS.issubset(lower):
        return "long"
    if any(h in lower for h in _WIDE_THRUST_HEADERS):
        return "wide"
    raise BadRequestError(
        "CSV format not recognized. Expected wide (thrust_0..thrust_3) or long "
        "(arm_index, thrust) columns."
    )


def _resolve_timestamp_field(headers: list[str]) -> str:
    for h in headers:
        if h.strip().lower() in _REQUIRED_TIMESTAMP_HEADERS:
            return h
    raise BadRequestError("Missing timestamp column")


def _maybe_float(row: dict[str, str], key: str, default: float = 0.0) -> float:
    val = row.get(key)
    if val is None or val == "":
        return default
    try:
        return float(val)
    except ValueError:
        return default


def _parse_wide(
    reader: csv.DictReader, ts_field: str
) -> tuple[list[tuple[datetime, list[float], dict[str, float]]], list[str]]:
    """Returns list of (timestamp, [thrust_per_arm], extras) and warnings."""
    samples: list[tuple[datetime, list[float], dict[str, float]]] = []
    warnings: list[str] = []
    for row_num, row in enumerate(reader, start=2):
        try:
            ts = _parse_timestamp(row[ts_field])
        except BadRequestError as exc:
            warnings.append(f"row {row_num}: {exc.detail}")
            continue
        thrusts = [
            _maybe_float(row, "thrust_0"),
            _maybe_float(row, "thrust_1"),
            _maybe_float(row, "thrust_2"),
            _maybe_float(row, "thrust_3"),
        ]
        extras = {
            "altitude": _maybe_float(row, "altitude"),
            "roll": _maybe_float(row, "roll"),
            "pitch": _maybe_float(row, "pitch"),
            "yaw": _maybe_float(row, "yaw"),
        }
        samples.append((ts, thrusts, extras))
    return samples, warnings


def _parse_long(
    reader: csv.DictReader, ts_field: str
) -> tuple[list[tuple[datetime, list[float], dict[str, float]]], list[str]]:
    """Long format: aggregates per timestamp into per-arm thrust list."""
    bucket: dict[datetime, dict[int, float]] = {}
    extras_by_ts: dict[datetime, dict[str, float]] = {}
    warnings: list[str] = []
    for row_num, row in enumerate(reader, start=2):
        try:
            ts = _parse_timestamp(row[ts_field])
        except BadRequestError as exc:
            warnings.append(f"row {row_num}: {exc.detail}")
            continue
        try:
            arm = int(float(row.get("arm_index", "0")))
        except ValueError:
            warnings.append(f"row {row_num}: invalid arm_index")
            continue
        if not 0 <= arm <= 3:
            warnings.append(f"row {row_num}: arm_index {arm} out of range")
            continue
        thrust = _maybe_float(row, "thrust")
        bucket.setdefault(ts, {})[arm] = thrust
        if ts not in extras_by_ts:
            extras_by_ts[ts] = {
                "altitude": _maybe_float(row, "altitude"),
                "roll": _maybe_float(row, "roll"),
                "pitch": _maybe_float(row, "pitch"),
                "yaw": _maybe_float(row, "yaw"),
            }

    samples: list[tuple[datetime, list[float], dict[str, float]]] = []
    for ts in sorted(bucket.keys()):
        per_arm = bucket[ts]
        thrusts = [per_arm.get(i, 0.0) for i in range(4)]
        samples.append((ts, thrusts, extras_by_ts.get(ts, {})))
    return samples, warnings


async def ingest_flight_csv(
    session: AsyncSession,
    bucket_name: str,
    org: str,
    drone_id: uuid.UUID,
    csv_text: str,
    label: str | None,
) -> IngestSummary:
    drone = await session.get(Drone, drone_id)
    if drone is None:
        raise BadRequestError(f"Drone {drone_id} not found")

    reader = csv.DictReader(io.StringIO(csv_text))
    if reader.fieldnames is None:
        raise BadRequestError("CSV has no header row")
    headers = list(reader.fieldnames)
    fmt = _detect_format(headers)
    ts_field = _resolve_timestamp_field(headers)

    if fmt == "wide":
        samples, warnings = _parse_wide(reader, ts_field)
    else:
        samples, warnings = _parse_long(reader, ts_field)

    if not samples:
        raise BadRequestError("No valid samples found in CSV")

    samples.sort(key=lambda s: s[0])
    started_at = samples[0][0]
    ended_at = samples[-1][0]
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    if ended_at.tzinfo is None:
        ended_at = ended_at.replace(tzinfo=timezone.utc)

    movements = [label] if label else ["real_flight"]
    mission = Mission(
        drone_id=drone.id,
        movements=movements,
        status=MissionStatus.completed,
        started_at=started_at,
        ended_at=ended_at,
    )
    session.add(mission)
    await session.commit()
    await session.refresh(mission)

    degradation = [0.0, 0.0, 0.0, 0.0]
    worst_sf = 10.0
    points: list[Point] = []
    drone_id_str = str(drone.id)
    mission_id_str = str(mission.id)

    for ts, thrusts, extras in samples:
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        ts_ns = int(ts.timestamp() * 1e9)

        for arm_idx, thrust in enumerate(thrusts):
            damage = physics.cycle_damage(thrust, degradation[arm_idx])
            degradation[arm_idx] = min(1.0, degradation[arm_idx] + damage)
            strength = physics.effective_strength_mpa(degradation[arm_idx])
            sf = physics.safety_factor(thrust, strength)
            torque = physics.torque_from_thrust(thrust)
            worst_sf = min(worst_sf, sf)

            point = (
                Point("arm_telemetry")
                .tag("drone_id", drone_id_str)
                .tag("arm_index", str(arm_idx))
                .tag("source", "real_flight")
                .tag("mission_id", mission_id_str)
                .field("thrust", float(thrust))
                .field("torque", float(torque))
                .field("safety_factor", float(sf))
                .field("degradation_factor", float(degradation[arm_idx]))
                .time(ts_ns, WritePrecision.NS)
            )
            points.append(point)

        if any(extras.get(k) for k in ("altitude", "roll", "pitch", "yaw")):
            position_point = (
                Point("drone_position")
                .tag("drone_id", drone_id_str)
                .tag("source", "real_flight")
                .tag("mission_id", mission_id_str)
                .field("x", 0.0)
                .field("y", 0.0)
                .field("z", float(extras.get("altitude", 0.0)))
                .field("roll", float(extras.get("roll", 0.0)))
                .field("pitch", float(extras.get("pitch", 0.0)))
                .field("yaw", float(extras.get("yaw", 0.0)))
                .time(ts_ns, WritePrecision.NS)
            )
            points.append(position_point)

    client = get_influx_client()
    write_api = client.write_api(write_options=SYNCHRONOUS)
    try:
        # Influx accepts batches; send in chunks to avoid huge payloads.
        chunk_size = 5000
        for i in range(0, len(points), chunk_size):
            write_api.write(bucket=bucket_name, org=org, record=points[i : i + chunk_size])
    finally:
        write_api.close()

    duration = max(0.0, (ended_at - started_at).total_seconds())

    return IngestSummary(
        mission_id=mission.id,
        drone_id=drone.id,
        rows_parsed=len(samples),
        samples_written=len(points),
        started_at=started_at,
        ended_at=ended_at,
        duration_seconds=duration,
        detected_format=fmt,
        worst_safety_factor=worst_sf,
        final_degradation_per_arm=degradation,
        warnings=warnings[:20],
    )
