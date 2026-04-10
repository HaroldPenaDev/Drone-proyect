import pytest

from src.models.material import Material
from src.models.impact import Impact
from src.engines.material_engine import (
    compute_cycle_degradation,
    accumulate_impact_damage,
)


def test_cycle_degradation_increases_factor():
    material = Material()
    degraded = compute_cycle_degradation(material, applied_stress_mpa=10.0)
    assert degraded.degradation_factor > material.degradation_factor


def test_cycle_degradation_zero_stress():
    material = Material()
    result = compute_cycle_degradation(material, applied_stress_mpa=0.0)
    assert result.degradation_factor == material.degradation_factor


def test_impact_damage_increases_degradation():
    material = Material()
    impact = Impact(
        direction="front",
        height_meters=2.0,
        contact_time_seconds=0.01,
        force_newtons=500.0,
    )
    damaged = accumulate_impact_damage(material, impact)
    assert damaged.degradation_factor > material.degradation_factor


def test_degradation_clamped_at_one():
    material = Material(degradation_factor=0.99)
    impact = Impact(
        direction="left",
        height_meters=10.0,
        contact_time_seconds=0.001,
        force_newtons=50000.0,
    )
    damaged = accumulate_impact_damage(material, impact)
    assert damaged.degradation_factor <= 1.0


def test_effective_strength_decreases_with_degradation():
    fresh = Material()
    degraded = Material(degradation_factor=0.5)
    assert degraded.effective_tensile_strength_mpa < fresh.effective_tensile_strength_mpa
