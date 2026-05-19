import math
from typing import Tuple

import numpy as np
from numpy.typing import NDArray

from src.models.material import Material
from src.models.impact import Impact, ImpactDirection
from src.constants.drone_specs import (
    ARM_LENGTH_M,
    ARM_MASS_KG,
    MOTOR_MASS_KG,
    CROSS_SECTION_AREA_M2,
    CROSS_SECTION_HEIGHT_M,
    MOMENT_OF_INERTIA_M4,
    GRAVITY_M_S2,
)

# Outer and inner diameters matching main.py D_CONST / d_CONST
ARM_OUTER_DIAMETER_M: float = 0.012
ARM_INNER_DIAMETER_M: float = 0.009


# ── Functions ported directly from Calculations.py ─────────────────────────

def _inertia(D: float, d: float = 0.0) -> float:
    """Second moment of area for a hollow circular section (Calculations.inertia)."""
    return math.pi * (D**4 - d**4) / 64


def _distributed_weight(L: float, arm_mass: float) -> float:
    """Distributed weight of the arm in N/m (Calculations.distributed_weigh)."""
    return (arm_mass * GRAVITY_M_S2) / L


def _first_moment(R: float, r: float = 0.0) -> float:
    """First moment of area Q for shear stress (Calculations.first_moment)."""
    return (2 * R**3 - 2 * r**3) / 3


def _shear_at_point(
    thrust_newtons: float,
    n: int = 1000,
) -> Tuple[NDArray[np.float64], NDArray[np.float64]]:
    """
    Shear force diagram along the arm (Calculations.shear_at_point).
    Accounts for motor point load at tip and arm distributed weight
    lumped at the midpoint, exactly as in Calculations.py.
    """
    L: float = ARM_LENGTH_M
    Lw: float = L / 2
    T: float = thrust_newtons
    Wm: float = MOTOR_MASS_KG * GRAVITY_M_S2
    W: float = ARM_MASS_KG * GRAVITY_M_S2
    x: NDArray[np.float64] = np.linspace(0.0, L, n)
    V: NDArray[np.float64] = np.piecewise(
        x,
        [x < Lw, (x >= Lw) & (x < L), x >= L],
        [
            lambda xi: T - Wm - W,
            lambda xi: T - Wm,
            lambda xi: T - Wm,
        ],
    )
    return V, x


def _bending_moment_at_point(
    thrust_newtons: float,
    n: int = 1000,
) -> Tuple[NDArray[np.float64], NDArray[np.float64]]:
    """
    Bending moment diagram along the arm (Calculations.bending_moment_at_point).
    Accounts for motor point load and arm distributed weight lumped at midpoint.
    """
    L: float = ARM_LENGTH_M
    Lw: float = L / 2
    T: float = thrust_newtons
    Wm: float = MOTOR_MASS_KG * GRAVITY_M_S2
    W: float = ARM_MASS_KG * GRAVITY_M_S2
    x: NDArray[np.float64] = np.linspace(0.0, L, n)
    M: NDArray[np.float64] = np.piecewise(
        x,
        [x < Lw, x >= Lw],
        [
            lambda xi: (T - Wm) * (L - xi) - W * (Lw - xi),
            lambda xi: (T - Wm) * (L - xi),
        ],
    )
    return x, M


# ── Public API used by the rest of the simulator ───────────────────────────

def compute_shear_force(thrust_newtons: float) -> float:
    """Peak (root) shear force in Newtons."""
    V, _ = _shear_at_point(thrust_newtons)
    return float(abs(V[0]))


def compute_bending_moment(thrust_newtons: float) -> float:
    """Peak (root) bending moment in N·m."""
    _, M = _bending_moment_at_point(thrust_newtons)
    return float(abs(M[0]))


def compute_max_bending_stress_mpa(bending_moment_nm: float) -> float:
    """Root bending stress in MPa from the accurate moment (σ = Mc/I)."""
    I: float = _inertia(ARM_OUTER_DIAMETER_M, ARM_INNER_DIAMETER_M)
    c: float = ARM_OUTER_DIAMETER_M / 2.0
    stress_pa: float = (bending_moment_nm * c) / I
    return stress_pa / 1e6


def compute_shear_stress_mpa(thrust_newtons: float) -> float:
    """Root shear stress in MPa (τ = VQ / It), from Calculations.shear_stress."""
    I: float = _inertia(ARM_OUTER_DIAMETER_M, ARM_INNER_DIAMETER_M)
    R: float = ARM_OUTER_DIAMETER_M / 2.0
    r: float = ARM_INNER_DIAMETER_M / 2.0
    Q: float = _first_moment(R, r)
    t: float = ARM_OUTER_DIAMETER_M - ARM_INNER_DIAMETER_M
    V, _ = _shear_at_point(thrust_newtons)
    V_root: float = float(abs(V[0]))
    return (V_root * Q) / (I * t) / 1e6


def compute_stress_profile(
    thrust_newtons: float,
    n: int = 50,
) -> Tuple[NDArray[np.float64], NDArray[np.float64]]:
    """
    Bending stress profile σ(x) along the arm in MPa.
    Mirrors stress_profile() from main.py: uses the accurate bending moment
    diagram that accounts for motor point load and distributed arm weight.
    Returns (xs, sigma) where xs is position array (m) and sigma is MPa.
    """
    I: float = _inertia(ARM_OUTER_DIAMETER_M, ARM_INNER_DIAMETER_M)
    c: float = ARM_OUTER_DIAMETER_M / 2.0
    xs, M_arr = _bending_moment_at_point(thrust_newtons, n=n)
    sigma: NDArray[np.float64] = np.abs(M_arr * c / I) / 1e6
    return xs, sigma


def compute_shear_profile(
    thrust_newtons: float,
    n: int = 50,
) -> Tuple[NDArray[np.float64], NDArray[np.float64]]:
    """
    Shear force profile V(x) along the arm in N.
    Returns (xs, V) matching the shear diagram in main.py.
    """
    V_full, x_full = _shear_at_point(thrust_newtons, n=n)
    return x_full, V_full


def compute_safety_factor(material: Material, thrust_newtons: float) -> float:
    """Safety factor using the accurate root bending stress."""
    bm: float = compute_bending_moment(thrust_newtons)
    applied_stress: float = compute_max_bending_stress_mpa(bm)
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
