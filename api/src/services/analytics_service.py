import uuid
from datetime import datetime, timezone

from influxdb_client.client.query_api import QueryApi
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import ApiSettings
from src.models.mission import Mission
from src.schemas.analytics_schema import (
    ArmAnalytics,
    MissionAnalytics,
    TelemetrySample,
)
from src.services import mission_service


_TIMESERIES_BUCKETS = 60


def _empty_analytics(mission: Mission) -> MissionAnalytics:
    return MissionAnalytics(
        mission_id=mission.id,
        drone_id=mission.drone_id,
        status=mission.status.value if hasattr(mission.status, "value") else str(mission.status),
        movements=mission.movements or [],
        started_at=mission.started_at,
        ended_at=mission.ended_at,
        duration_seconds=0.0,
        data_points=0,
        overall_avg_thrust=0.0,
        overall_peak_thrust=0.0,
        worst_safety_factor=0.0,
        avg_safety_factor=0.0,
        total_degradation_delta=0.0,
        arms=[],
        timeseries=[],
    )


def _to_iso(ts: datetime) -> str:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _arm_aggregates_query(bucket: str, drone_id: str, start: str, stop: str) -> str:
    return (
        f'from(bucket: "{bucket}")'
        f" |> range(start: {start}, stop: {stop})"
        f' |> filter(fn: (r) => r._measurement == "arm_telemetry")'
        f' |> filter(fn: (r) => r.drone_id == "{drone_id}")'
        f' |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")'
        f' |> group(columns:["arm_index"])'
    )


def _per_arm_metrics(
    query_api: QueryApi, settings: ApiSettings, drone_id: str, start: str, stop: str
) -> tuple[list[ArmAnalytics], int]:
    flux = _arm_aggregates_query(settings.influxdb_bucket, drone_id, start, stop)
    tables = query_api.query(flux, org=settings.influxdb_org)

    per_arm: dict[int, dict[str, list[float]]] = {}
    times_per_arm: dict[int, list[datetime]] = {}
    for table in tables:
        for record in table.records:
            try:
                arm_idx = int(record.values.get("arm_index", 0))
            except (TypeError, ValueError):
                continue
            slot = per_arm.setdefault(
                arm_idx,
                {"thrust": [], "torque": [], "safety_factor": [], "degradation_factor": []},
            )
            slot["thrust"].append(float(record.values.get("thrust", 0.0)))
            slot["torque"].append(float(record.values.get("torque", 0.0)))
            slot["safety_factor"].append(float(record.values.get("safety_factor", 0.0)))
            slot["degradation_factor"].append(float(record.values.get("degradation_factor", 0.0)))
            times_per_arm.setdefault(arm_idx, []).append(record.get_time())

    arms: list[ArmAnalytics] = []
    total_points = 0
    for arm_idx in sorted(per_arm.keys()):
        data = per_arm[arm_idx]
        times = times_per_arm.get(arm_idx, [])
        if not data["thrust"]:
            continue
        order = sorted(range(len(times)), key=lambda i: times[i])
        deg_sorted = [data["degradation_factor"][i] for i in order]
        start_deg = deg_sorted[0]
        end_deg = deg_sorted[-1]
        total_points = max(total_points, len(data["thrust"]))
        arms.append(
            ArmAnalytics(
                arm_index=arm_idx,
                avg_thrust=sum(data["thrust"]) / len(data["thrust"]),
                max_thrust=max(data["thrust"]),
                avg_torque=sum(data["torque"]) / len(data["torque"]),
                max_torque=max(data["torque"]),
                min_safety_factor=min(data["safety_factor"]),
                avg_safety_factor=sum(data["safety_factor"]) / len(data["safety_factor"]),
                start_degradation=start_deg,
                end_degradation=end_deg,
                degradation_delta=max(0.0, end_deg - start_deg),
            )
        )
    return arms, total_points


def _timeseries_query(
    bucket: str, drone_id: str, start: str, stop: str, every: str
) -> str:
    return (
        f'from(bucket: "{bucket}")'
        f" |> range(start: {start}, stop: {stop})"
        f' |> filter(fn: (r) => r._measurement == "arm_telemetry")'
        f' |> filter(fn: (r) => r.drone_id == "{drone_id}")'
        f' |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")'
        f' |> aggregateWindow(every: {every}, fn: mean, column: "thrust", createEmpty: false)'
    )


def _downsampled_timeseries(
    query_api: QueryApi,
    settings: ApiSettings,
    drone_id: str,
    started_at: datetime,
    ended_at: datetime,
) -> list[TelemetrySample]:
    duration = max((ended_at - started_at).total_seconds(), 1.0)
    bucket_seconds = max(int(duration / _TIMESERIES_BUCKETS), 1)
    every = f"{bucket_seconds}s"

    flux = (
        f'from(bucket: "{settings.influxdb_bucket}")'
        f" |> range(start: {_to_iso(started_at)}, stop: {_to_iso(ended_at)})"
        f' |> filter(fn: (r) => r._measurement == "arm_telemetry")'
        f' |> filter(fn: (r) => r.drone_id == "{drone_id}")'
        f' |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")'
        f' |> group(columns:["_time"])'
        f' |> reduce(identity: {{thrust_sum: 0.0, count: 0.0, sf_min: 100.0, deg_max: 0.0}}, '
        f'  fn: (r, accumulator) => ({{'
        f'    thrust_sum: accumulator.thrust_sum + r.thrust,'
        f'    count: accumulator.count + 1.0,'
        f'    sf_min: if r.safety_factor < accumulator.sf_min then r.safety_factor else accumulator.sf_min,'
        f'    deg_max: if r.degradation_factor > accumulator.deg_max then r.degradation_factor else accumulator.deg_max'
        f'  }}))'
        f' |> map(fn: (r) => ({{ _time: r._time, thrust_avg: r.thrust_sum / r.count, sf_min: r.sf_min, deg_max: r.deg_max }}))'
        f' |> group()'
        f' |> sort(columns:["_time"])'
        f' |> aggregateWindow(every: {every}, fn: mean, column: "thrust_avg", createEmpty: false)'
    )

    samples: list[TelemetrySample] = []
    try:
        tables = query_api.query(flux, org=settings.influxdb_org)
        for table in tables:
            for record in table.records:
                t = record.get_time()
                if t is None:
                    continue
                t_secs = (t - started_at).total_seconds()
                samples.append(
                    TelemetrySample(
                        t_seconds=max(0.0, t_secs),
                        avg_thrust=float(record.values.get("thrust_avg", 0.0) or 0.0),
                        min_safety_factor=float(record.values.get("sf_min", 0.0) or 0.0),
                        max_degradation=float(record.values.get("deg_max", 0.0) or 0.0),
                    )
                )
    except Exception:
        samples = _fallback_timeseries(query_api, settings, drone_id, started_at, ended_at, every)
    if not samples:
        samples = _fallback_timeseries(query_api, settings, drone_id, started_at, ended_at, every)
    return samples


def _fallback_timeseries(
    query_api: QueryApi,
    settings: ApiSettings,
    drone_id: str,
    started_at: datetime,
    ended_at: datetime,
    every: str,
) -> list[TelemetrySample]:
    """Simpler downsampled query that aggregates per arm then averages in python."""
    flux = (
        f'from(bucket: "{settings.influxdb_bucket}")'
        f" |> range(start: {_to_iso(started_at)}, stop: {_to_iso(ended_at)})"
        f' |> filter(fn: (r) => r._measurement == "arm_telemetry")'
        f' |> filter(fn: (r) => r.drone_id == "{drone_id}")'
        f' |> aggregateWindow(every: {every}, fn: mean, createEmpty: false)'
        f' |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")'
    )
    bucketed: dict[datetime, dict[str, list[float]]] = {}
    tables = query_api.query(flux, org=settings.influxdb_org)
    for table in tables:
        for record in table.records:
            t = record.get_time()
            if t is None:
                continue
            slot = bucketed.setdefault(t, {"thrust": [], "sf": [], "deg": []})
            slot["thrust"].append(float(record.values.get("thrust", 0.0) or 0.0))
            slot["sf"].append(float(record.values.get("safety_factor", 0.0) or 0.0))
            slot["deg"].append(float(record.values.get("degradation_factor", 0.0) or 0.0))

    samples: list[TelemetrySample] = []
    for t in sorted(bucketed.keys()):
        data = bucketed[t]
        if not data["thrust"]:
            continue
        samples.append(
            TelemetrySample(
                t_seconds=max(0.0, (t - started_at).total_seconds()),
                avg_thrust=sum(data["thrust"]) / len(data["thrust"]),
                min_safety_factor=min(data["sf"]) if data["sf"] else 0.0,
                max_degradation=max(data["deg"]) if data["deg"] else 0.0,
            )
        )
    return samples


async def analyze_mission(
    session: AsyncSession,
    query_api: QueryApi,
    settings: ApiSettings,
    mission_id: uuid.UUID,
) -> MissionAnalytics | None:
    mission = await mission_service.get_mission(session, mission_id)
    if mission is None:
        return None
    if mission.started_at is None:
        return _empty_analytics(mission)

    end_time = mission.ended_at or datetime.now(timezone.utc)
    if end_time <= mission.started_at:
        return _empty_analytics(mission)

    drone_id_str = str(mission.drone_id)
    start_iso = _to_iso(mission.started_at)
    stop_iso = _to_iso(end_time)

    arms, total_points = _per_arm_metrics(
        query_api, settings, drone_id_str, start_iso, stop_iso
    )
    timeseries = _downsampled_timeseries(
        query_api, settings, drone_id_str, mission.started_at, end_time
    )

    if not arms:
        empty = _empty_analytics(mission)
        empty.duration_seconds = (end_time - mission.started_at).total_seconds()
        empty.timeseries = timeseries
        return empty

    overall_avg_thrust = sum(a.avg_thrust for a in arms) / len(arms)
    overall_peak_thrust = max(a.max_thrust for a in arms)
    worst_safety_factor = min(a.min_safety_factor for a in arms)
    avg_safety_factor = sum(a.avg_safety_factor for a in arms) / len(arms)
    total_degradation_delta = sum(a.degradation_delta for a in arms)

    return MissionAnalytics(
        mission_id=mission.id,
        drone_id=mission.drone_id,
        status=mission.status.value if hasattr(mission.status, "value") else str(mission.status),
        movements=mission.movements or [],
        started_at=mission.started_at,
        ended_at=mission.ended_at,
        duration_seconds=(end_time - mission.started_at).total_seconds(),
        data_points=total_points,
        overall_avg_thrust=overall_avg_thrust,
        overall_peak_thrust=overall_peak_thrust,
        worst_safety_factor=worst_safety_factor,
        avg_safety_factor=avg_safety_factor,
        total_degradation_delta=total_degradation_delta,
        arms=arms,
        timeseries=timeseries,
    )
