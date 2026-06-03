from datetime import datetime, timezone

from influxdb_client.client.query_api import QueryApi

from src.config import ApiSettings
from src.core import physics
from src.schemas.predictive_schema import ArmPrediction, DronePrediction


CRITICAL_SAFETY_FACTOR = 1.5
CRITICAL_DEGRADATION = 1.0 - (
    physics.bending_stress_mpa(physics.ONYX_TENSILE_STRENGTH_MPA / 100)
)  # not used directly; we solve via safety factor instead

_LOOKBACK = "-30d"
_MIN_SAMPLES = 10


def _query_degradation_history(
    query_api: QueryApi, settings: ApiSettings, drone_id: str
) -> dict[int, list[tuple[datetime, float, float]]]:
    """Returns {arm_index: [(timestamp, degradation, thrust)]} sorted by time."""
    flux = (
        f'from(bucket: "{settings.influxdb_bucket}")'
        f" |> range(start: {_LOOKBACK})"
        f' |> filter(fn: (r) => r._measurement == "arm_telemetry")'
        f' |> filter(fn: (r) => r.drone_id == "{drone_id}")'
        f' |> filter(fn: (r) => r._field == "degradation_factor" or r._field == "thrust")'
        f' |> aggregateWindow(every: 30s, fn: mean, createEmpty: false)'
        f' |> pivot(rowKey:["_time","arm_index"], columnKey:["_field"], valueColumn:"_value")'
    )
    out: dict[int, list[tuple[datetime, float, float]]] = {}
    try:
        tables = query_api.query(flux, org=settings.influxdb_org)
        for table in tables:
            for record in table.records:
                t = record.get_time()
                if t is None:
                    continue
                try:
                    arm_idx = int(record.values.get("arm_index", 0))
                except (TypeError, ValueError):
                    continue
                deg = record.values.get("degradation_factor")
                thrust = record.values.get("thrust")
                if deg is None:
                    continue
                out.setdefault(arm_idx, []).append(
                    (t, float(deg), float(thrust or 0.0))
                )
    except Exception:
        return {}
    for arm in out:
        out[arm].sort(key=lambda r: r[0])
    return out


def _linear_fit(xs: list[float], ys: list[float]) -> tuple[float, float, float]:
    """Returns (slope, intercept, r_squared). xs and ys must be same length and non-empty."""
    n = len(xs)
    if n < 2:
        return 0.0, ys[0] if ys else 0.0, 0.0
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(n))
    den = sum((xs[i] - mean_x) ** 2 for i in range(n))
    if den == 0:
        return 0.0, mean_y, 0.0
    slope = num / den
    intercept = mean_y - slope * mean_x
    ss_res = sum((ys[i] - (slope * xs[i] + intercept)) ** 2 for i in range(n))
    ss_tot = sum((ys[i] - mean_y) ** 2 for i in range(n))
    r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
    return slope, intercept, max(0.0, min(1.0, r2))


def _critical_degradation_for_thrust(thrust: float) -> float:
    """Solve for degradation d such that SF == CRITICAL_SAFETY_FACTOR.
    SF = strength_mpa(d) / applied_stress; strength_mpa(d) = TS * (1 - d).
    => CRITICAL_SF * applied = TS * (1 - d) => d = 1 - CRITICAL_SF * applied / TS
    """
    if thrust <= 0:
        return 1.0
    applied = physics.bending_stress_mpa(thrust)
    if applied <= 0:
        return 1.0
    target_strength = CRITICAL_SAFETY_FACTOR * applied
    if target_strength >= physics.ONYX_TENSILE_STRENGTH_MPA:
        return 0.0  # already critical at this thrust
    return max(0.0, 1.0 - target_strength / physics.ONYX_TENSILE_STRENGTH_MPA)


def _arm_prediction(
    arm_idx: int, samples: list[tuple[datetime, float, float]]
) -> ArmPrediction:
    if not samples or len(samples) < _MIN_SAMPLES:
        return ArmPrediction(
            arm_index=arm_idx,
            current_degradation=samples[-1][1] if samples else 0.0,
            current_safety_factor=10.0,
            degradation_rate_per_hour=0.0,
            hours_until_critical=None,
            cycles_until_critical=None,
            health_status="stable",
            confidence=0.0,
        )

    t0 = samples[0][0]
    xs = [(s[0] - t0).total_seconds() / 3600.0 for s in samples]  # hours
    ys = [s[1] for s in samples]
    slope, intercept, r2 = _linear_fit(xs, ys)

    current_deg = samples[-1][1]
    avg_thrust = sum(s[2] for s in samples[-50:]) / max(1, len(samples[-50:]))
    if avg_thrust <= 0:
        avg_thrust = 3.0  # hover baseline

    current_strength = physics.effective_strength_mpa(current_deg)
    current_sf = physics.safety_factor(avg_thrust, current_strength)
    crit_deg = _critical_degradation_for_thrust(avg_thrust)

    if slope <= 1e-12:
        hours_until = None
        cycles_until = None
        status = "stable"
    elif current_deg >= crit_deg:
        hours_until = 0.0
        cycles_until = 0
        status = "critical"
    else:
        remaining_deg = crit_deg - current_deg
        hours_until = remaining_deg / slope
        cycles_until = int(hours_until * 7200) if hours_until is not None else None
        if hours_until < 24:
            status = "critical"
        elif hours_until < 168:
            status = "watch"
        else:
            status = "healthy"

    return ArmPrediction(
        arm_index=arm_idx,
        current_degradation=current_deg,
        current_safety_factor=current_sf,
        degradation_rate_per_hour=slope,
        hours_until_critical=hours_until,
        cycles_until_critical=cycles_until,
        health_status=status,
        confidence=r2,
    )


def predict_drone(
    query_api: QueryApi, settings: ApiSettings, drone_id: str
) -> DronePrediction:
    history = _query_degradation_history(query_api, settings, drone_id)
    arms: list[ArmPrediction] = []
    sample_count = 0
    for arm_idx in sorted(history.keys()):
        samples = history[arm_idx]
        sample_count = max(sample_count, len(samples))
        arms.append(_arm_prediction(arm_idx, samples))

    while len(arms) < 4:
        arms.append(
            ArmPrediction(
                arm_index=len(arms),
                current_degradation=0.0,
                current_safety_factor=10.0,
                degradation_rate_per_hour=0.0,
                hours_until_critical=None,
                cycles_until_critical=None,
                health_status="stable",
                confidence=0.0,
            )
        )
    arms.sort(key=lambda a: a.arm_index)

    horizon_hours = 0.0
    if history:
        first_ts = min(samples[0][0] for samples in history.values() if samples)
        last_ts = max(samples[-1][0] for samples in history.values() if samples)
        horizon_hours = (last_ts - first_ts).total_seconds() / 3600.0

    statuses = [a.health_status for a in arms]
    if "critical" in statuses:
        overall = "critical"
    elif "watch" in statuses:
        overall = "watch"
    elif all(s in ("healthy", "stable") for s in statuses):
        overall = "healthy"
    else:
        overall = "stable"

    earliest = [
        a.hours_until_critical for a in arms if a.hours_until_critical is not None
    ]
    next_inspection = min(earliest) / 2.0 if earliest else None

    return DronePrediction(
        drone_id=drone_id,
        samples_analyzed=sample_count,
        horizon_hours=horizon_hours,
        arms=arms,
        overall_health=overall,
        next_inspection_recommended_hours=next_inspection,
    )
