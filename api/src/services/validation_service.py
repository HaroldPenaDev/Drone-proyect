import math
import uuid
from datetime import datetime, timezone

from influxdb_client.client.query_api import QueryApi
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import ApiSettings
from src.core.exceptions import BadRequestError, NotFoundError
from src.models.mission import Mission, MissionStatus
from src.schemas.validation_schema import (
    PairedSample,
    SuggestedPair,
    ValidationDeltas,
    ValidationResponse,
)
from src.services import mission_service


_BUCKETS = 60


def _to_iso(ts: datetime) -> str:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _bucketed_series(
    query_api: QueryApi,
    settings: ApiSettings,
    drone_id: str,
    start: datetime,
    end: datetime,
) -> list[tuple[float, float, float, float]]:
    """Returns [(t_seconds, mean_thrust, min_sf, max_deg)] downsampled to ~_BUCKETS points."""
    duration = max((end - start).total_seconds(), 1.0)
    every_secs = max(int(duration / _BUCKETS), 1)
    flux = (
        f'from(bucket: "{settings.influxdb_bucket}")'
        f" |> range(start: {_to_iso(start)}, stop: {_to_iso(end)})"
        f' |> filter(fn: (r) => r._measurement == "arm_telemetry")'
        f' |> filter(fn: (r) => r.drone_id == "{drone_id}")'
        f' |> aggregateWindow(every: {every_secs}s, fn: mean, createEmpty: false)'
        f' |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")'
    )
    bucketed: dict[float, dict[str, list[float]]] = {}
    try:
        tables = query_api.query(flux, org=settings.influxdb_org)
        for table in tables:
            for record in table.records:
                t = record.get_time()
                if t is None:
                    continue
                t_secs = max(0.0, (t - start).total_seconds())
                key = round(t_secs / every_secs) * every_secs
                slot = bucketed.setdefault(
                    key, {"thrust": [], "sf": [], "deg": []}
                )
                slot["thrust"].append(float(record.values.get("thrust", 0.0) or 0.0))
                slot["sf"].append(float(record.values.get("safety_factor", 0.0) or 0.0))
                slot["deg"].append(
                    float(record.values.get("degradation_factor", 0.0) or 0.0)
                )
    except Exception:
        return []

    samples: list[tuple[float, float, float, float]] = []
    for key in sorted(bucketed.keys()):
        data = bucketed[key]
        if not data["thrust"]:
            continue
        samples.append(
            (
                key,
                sum(data["thrust"]) / len(data["thrust"]),
                min(data["sf"]) if data["sf"] else 0.0,
                max(data["deg"]) if data["deg"] else 0.0,
            )
        )
    return samples


def _interpolate(
    series: list[tuple[float, float, float, float]], t_target: float
) -> tuple[float, float, float] | None:
    if not series:
        return None
    if t_target <= series[0][0]:
        return series[0][1], series[0][2], series[0][3]
    if t_target >= series[-1][0]:
        return series[-1][1], series[-1][2], series[-1][3]
    for i in range(1, len(series)):
        if series[i][0] >= t_target:
            t0, th0, sf0, dg0 = series[i - 1]
            t1, th1, sf1, dg1 = series[i]
            span = t1 - t0
            if span <= 0:
                return th1, sf1, dg1
            frac = (t_target - t0) / span
            return (
                th0 + frac * (th1 - th0),
                sf0 + frac * (sf1 - sf0),
                dg0 + frac * (dg1 - dg0),
            )
    return None


def _correlation(a: list[float], b: list[float]) -> float:
    n = min(len(a), len(b))
    if n < 2:
        return 0.0
    a = a[:n]
    b = b[:n]
    mean_a = sum(a) / n
    mean_b = sum(b) / n
    num = sum((a[i] - mean_a) * (b[i] - mean_b) for i in range(n))
    den_a = math.sqrt(sum((x - mean_a) ** 2 for x in a))
    den_b = math.sqrt(sum((x - mean_b) ** 2 for x in b))
    if den_a == 0 or den_b == 0:
        return 0.0
    return num / (den_a * den_b)


async def _get_completed(session: AsyncSession, mission_id: uuid.UUID) -> Mission:
    mission = await mission_service.get_mission(session, mission_id)
    if mission is None:
        raise NotFoundError("Mission", str(mission_id))
    if mission.started_at is None or mission.ended_at is None:
        raise BadRequestError(
            f"Mission {mission_id} has no completed time range"
        )
    return mission


async def validate_real_vs_sim(
    session: AsyncSession,
    query_api: QueryApi,
    settings: ApiSettings,
    real_mission_id: uuid.UUID,
    sim_mission_id: uuid.UUID,
) -> ValidationResponse:
    real = await _get_completed(session, real_mission_id)
    sim = await _get_completed(session, sim_mission_id)

    real_series = _bucketed_series(
        query_api, settings, str(real.drone_id), real.started_at, real.ended_at
    )
    sim_series = _bucketed_series(
        query_api, settings, str(sim.drone_id), sim.started_at, sim.ended_at
    )

    real_dur = (real.ended_at - real.started_at).total_seconds()
    sim_dur = (sim.ended_at - sim.started_at).total_seconds()

    # Normalize timeline to [0..1] of each mission; sample at common points.
    n_points = min(max(len(real_series), len(sim_series), 20), 80)
    paired: list[PairedSample] = []
    real_thrusts: list[float] = []
    sim_thrusts: list[float] = []
    real_sfs: list[float] = []
    sim_sfs: list[float] = []
    real_degs: list[float] = []
    sim_degs: list[float] = []

    for i in range(n_points):
        frac = i / max(1, n_points - 1)
        t_real = frac * real_dur
        t_sim = frac * sim_dur
        r = _interpolate(real_series, t_real)
        s = _interpolate(sim_series, t_sim)
        sample = PairedSample(
            t_seconds=t_real,
            real_thrust=r[0] if r else None,
            sim_thrust=s[0] if s else None,
            real_safety_factor=r[1] if r else None,
            sim_safety_factor=s[1] if s else None,
            real_degradation=r[2] if r else None,
            sim_degradation=s[2] if s else None,
        )
        paired.append(sample)
        if r and s:
            real_thrusts.append(r[0])
            sim_thrusts.append(s[0])
            real_sfs.append(r[1])
            sim_sfs.append(s[1])
            real_degs.append(r[2])
            sim_degs.append(s[2])

    deltas = _compute_deltas(
        real_thrusts, sim_thrusts, real_sfs, sim_sfs, real_degs, sim_degs
    )

    return ValidationResponse(
        real_mission_id=real.id,
        sim_mission_id=sim.id,
        real_started_at=real.started_at,
        sim_started_at=sim.started_at,
        real_duration_seconds=real_dur,
        sim_duration_seconds=sim_dur,
        samples=paired,
        deltas=deltas,
    )


def _compute_deltas(
    rt: list[float],
    st: list[float],
    rsf: list[float],
    ssf: list[float],
    rd: list[float],
    sd: list[float],
) -> ValidationDeltas:
    n = len(rt)
    if n == 0:
        return ValidationDeltas(
            thrust_mae=0.0,
            thrust_rmse=0.0,
            thrust_correlation=0.0,
            safety_factor_mae=0.0,
            safety_factor_rmse=0.0,
            degradation_mae=0.0,
            overall_score=0.0,
            verdict="No hay datos suficientes para validar",
        )

    def mae(a: list[float], b: list[float]) -> float:
        return sum(abs(a[i] - b[i]) for i in range(len(a))) / len(a)

    def rmse(a: list[float], b: list[float]) -> float:
        return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(len(a))) / len(a))

    th_mae = mae(rt, st)
    th_rmse = rmse(rt, st)
    th_corr = _correlation(rt, st)
    sf_mae = mae(rsf, ssf)
    sf_rmse = rmse(rsf, ssf)
    deg_mae = mae(rd, sd)

    # Score: weighted by how close the model matches reality.
    avg_thrust = max(0.001, sum(rt) / n)
    avg_sf = max(0.001, sum(rsf) / n)
    thrust_norm_err = min(1.0, th_rmse / avg_thrust)
    sf_norm_err = min(1.0, sf_rmse / avg_sf)
    score = max(
        0.0,
        100.0
        * (
            0.45 * (1.0 - thrust_norm_err)
            + 0.45 * (1.0 - sf_norm_err)
            + 0.10 * max(0.0, th_corr)
        ),
    )

    if score >= 85:
        verdict = "Excelente — el modelo predice la realidad con alta fidelidad"
    elif score >= 70:
        verdict = "Bueno — el modelo es válido, con desviaciones menores"
    elif score >= 50:
        verdict = "Aceptable — útil para tendencias, no para precisión absoluta"
    else:
        verdict = "Bajo — el modelo necesita calibración para esta condición"

    return ValidationDeltas(
        thrust_mae=th_mae,
        thrust_rmse=th_rmse,
        thrust_correlation=th_corr,
        safety_factor_mae=sf_mae,
        safety_factor_rmse=sf_rmse,
        degradation_mae=deg_mae,
        overall_score=score,
        verdict=verdict,
    )


async def list_validation_candidates(
    session: AsyncSession, drone_id: uuid.UUID
) -> tuple[list[Mission], list[Mission]]:
    """Returns (real_missions, sim_missions) for a drone."""
    stmt = (
        select(Mission)
        .where(Mission.drone_id == drone_id)
        .where(Mission.status == MissionStatus.completed)
        .order_by(Mission.created_at.desc())
    )
    rows = (await session.execute(stmt)).scalars().all()
    real = [m for m in rows if m.movements and "real_flight" in (m.movements or []) or _is_real_label(m.movements)]
    sim = [m for m in rows if m not in real]
    return list(real), list(sim)


def _is_real_label(movements: list[str] | None) -> bool:
    if not movements:
        return False
    if "real_flight" in movements:
        return True
    # Heuristic: real-flight uploads typically have a single non-movement label.
    movement_keywords = {
        "hover", "ascend", "descend", "left", "right",
        "forward", "backward", "clockwise", "counterclockwise",
    }
    if len(movements) == 1 and movements[0] not in movement_keywords:
        return True
    return False


async def suggest_pair(
    session: AsyncSession, real_mission_id: uuid.UUID
) -> SuggestedPair | None:
    real = await mission_service.get_mission(session, real_mission_id)
    if real is None or real.started_at is None or real.ended_at is None:
        return None
    real_dur = (real.ended_at - real.started_at).total_seconds()

    stmt = (
        select(Mission)
        .where(Mission.drone_id == real.drone_id)
        .where(Mission.status == MissionStatus.completed)
        .where(Mission.id != real.id)
    )
    candidates = (await session.execute(stmt)).scalars().all()
    sim_candidates = [m for m in candidates if not _is_real_label(m.movements)]
    if not sim_candidates:
        return None

    best = None
    best_score = -1.0
    for cand in sim_candidates:
        if cand.started_at is None or cand.ended_at is None:
            continue
        cand_dur = (cand.ended_at - cand.started_at).total_seconds()
        if cand_dur <= 0:
            continue
        ratio = min(real_dur, cand_dur) / max(real_dur, cand_dur)
        if ratio > best_score:
            best_score = ratio
            best = cand

    if best is None:
        return None
    return SuggestedPair(
        real_mission_id=real.id,
        sim_mission_id=best.id,
        similarity_score=best_score,
    )
