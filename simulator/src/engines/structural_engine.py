import math
from typing import Tuple

from src.models.material import Material
from src.models.impact import Impact, ImpactDirection
from src.constants.drone_specs import (
    ARM_LENGTH_M,
    CROSS_SECTION_AREA_M2,
    CROSS_SECTION_HEIGHT_M,
    MOMENT_OF_INERTIA_M4,
    GRAVITY_M_S2,
)


def compute_shear_force(thrust_newtons: float) -> float:
    return abs(thrust_newtons)


def compute_bending_moment(thrust_newtons: float) -> float:
    return abs(thrust_newtons) * ARM_LENGTH_M


def compute_max_bending_stress_mpa(bending_moment: float) -> float:
    distance_to_neutral_axis: float = CROSS_SECTION_HEIGHT_M / 2.0
    stress_pa: float = (bending_moment * distance_to_neutral_axis) / MOMENT_OF_INERTIA_M4
    return stress_pa / 1e6


def compute_safety_factor(material: Material, thrust_newtons: float) -> float:
    bending_moment: float = compute_bending_moment(thrust_newtons)
    applied_stress: float = compute_max_bending_stress_mpa(bending_moment)
    if applied_stress <= 0.0:
        return 10.0
    return material.effective_tensile_strength_mpa / applied_stress


def compute_all_safety_factors(
    materials: Tuple[Material, Material, Material, Material],
    thrusts: Tuple[float, float, float, float],
) -> Tuple[float, float, float, float]:
    return (
        compute_safety_factor(materials[0], thrusts[0]),
        compute_safety_factor(materials[1], thrusts[1]),
        compute_safety_factor(materials[2], thrusts[2]),
        compute_safety_factor(materials[3], thrusts[3]),
    )


def compute_impact_force(
    mass_kg: float,
    height_meters: float,
    contact_time_seconds: float,
) -> float:
    if contact_time_seconds <= 0.0:
        return 0.0
    velocity_at_impact: float = math.sqrt(2.0 * GRAVITY_M_S2 * height_meters)
    return mass_kg * velocity_at_impact / contact_time_seconds


def create_impact_event(
    direction: ImpactDirection,
    mass_kg: float,
    height_meters: float,
    contact_time_seconds: float,
) -> Impact:
    force: float = compute_impact_force(mass_kg, height_meters, contact_time_seconds)
    return Impact(
        direction=direction,
        height_meters=height_meters,
        contact_time_seconds=contact_time_seconds,
        force_newtons=force,
    )
