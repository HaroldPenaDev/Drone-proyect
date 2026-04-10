from src.models.material import Material
from src.models.impact import Impact
from src.constants.material_properties import (
    ONYX_ENERGY_ABSORPTION_COEFFICIENT,
    DEGRADATION_PER_CYCLE_BASE,
)
from src.constants.drone_specs import CROSS_SECTION_AREA_M2


def compute_stress_ratio(material: Material, applied_stress_mpa: float) -> float:
    if applied_stress_mpa <= 0.0:
        return 0.0
    return applied_stress_mpa / material.effective_tensile_strength_mpa


def compute_cycles_to_failure(material: Material, stress_ratio: float) -> float:
    if stress_ratio <= 0.0:
        return float("inf")
    if stress_ratio >= 1.0:
        return 1.0
    return (1.0 / stress_ratio) ** material.fatigue_coefficient


def compute_cycle_degradation(
    material: Material,
    applied_stress_mpa: float,
    flight_cycles: int = 1,
) -> Material:
    stress_ratio: float = compute_stress_ratio(material, applied_stress_mpa)
    cycles_to_failure: float = compute_cycles_to_failure(material, stress_ratio)
    damage_per_cycle: float = 1.0 / cycles_to_failure if cycles_to_failure > 0 else 0.0
    additional_damage: float = damage_per_cycle * flight_cycles * DEGRADATION_PER_CYCLE_BASE
    new_degradation: float = material.degradation_factor + additional_damage
    return material.with_degradation(new_degradation)


def accumulate_impact_damage(material: Material, impact: Impact) -> Material:
    cross_section_m2: float = CROSS_SECTION_AREA_M2
    tensile_pa: float = material.effective_tensile_strength_mpa * 1e6
    if tensile_pa <= 0.0:
        return material.with_degradation(1.0)
    damage_increment: float = impact.force_newtons / (
        tensile_pa * cross_section_m2 * ONYX_ENERGY_ABSORPTION_COEFFICIENT
    )
    new_degradation: float = material.degradation_factor + damage_increment
    return material.with_degradation(new_degradation)
