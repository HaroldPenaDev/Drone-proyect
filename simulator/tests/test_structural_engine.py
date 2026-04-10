import pytest

from src.models.material import Material
from src.engines.structural_engine import (
    compute_shear_force,
    compute_bending_moment,
    compute_safety_factor,
    compute_impact_force,
)


def test_shear_force_equals_thrust():
    assert compute_shear_force(5.0) == 5.0
    assert compute_shear_force(-3.0) == 3.0


def test_bending_moment_proportional_to_thrust():
    moment_low = compute_bending_moment(2.0)
    moment_high = compute_bending_moment(4.0)
    assert abs(moment_high / moment_low - 2.0) < 1e-6


def test_safety_factor_decreases_with_higher_thrust():
    material = Material()
    sf_low = compute_safety_factor(material, 2.0)
    sf_high = compute_safety_factor(material, 6.0)
    assert sf_low > sf_high


def test_safety_factor_with_zero_thrust():
    material = Material()
    sf = compute_safety_factor(material, 0.0)
    assert sf == 10.0


def test_impact_force_formula():
    force = compute_impact_force(mass_kg=1.2, height_meters=2.0, contact_time_seconds=0.01)
    assert force > 0
    assert force > 100


def test_impact_force_zero_contact_time():
    force = compute_impact_force(mass_kg=1.0, height_meters=1.0, contact_time_seconds=0.0)
    assert force == 0.0
