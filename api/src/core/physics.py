"""Physics functions matching the simulator (structural + material engines).

Replicated here so the API can recompute Safety Factor and degradation from
externally ingested telemetry without depending on the simulator package.
"""

ONYX_TENSILE_STRENGTH_MPA: float = 36.0
ONYX_FATIGUE_EXPONENT: float = 10.0
DEGRADATION_PER_CYCLE_BASE: float = 5000.0

ARM_LENGTH_M: float = 0.25
CROSS_SECTION_HEIGHT_M: float = 0.01
MOMENT_OF_INERTIA_M4: float = 5.2e-10


def torque_from_thrust(thrust_newtons: float) -> float:
    """Motor curve: torque = 0.009·T² + 0.145·T + 0.0005."""
    t = abs(thrust_newtons)
    return 0.009 * t * t + 0.145 * t + 0.0005


def bending_moment_nm(thrust_newtons: float) -> float:
    return abs(thrust_newtons) * ARM_LENGTH_M


def bending_stress_mpa(thrust_newtons: float) -> float:
    moment = bending_moment_nm(thrust_newtons)
    distance = CROSS_SECTION_HEIGHT_M / 2.0
    stress_pa = (moment * distance) / MOMENT_OF_INERTIA_M4
    return stress_pa / 1e6


def safety_factor(thrust_newtons: float, effective_strength_mpa: float) -> float:
    applied = bending_stress_mpa(thrust_newtons)
    if applied <= 0.0:
        return 10.0
    return effective_strength_mpa / applied


def effective_strength_mpa(degradation: float) -> float:
    """Material weakens linearly with degradation (clamped at 0)."""
    factor = max(0.0, 1.0 - max(0.0, degradation))
    return ONYX_TENSILE_STRENGTH_MPA * factor


def cycle_damage(thrust_newtons: float, current_degradation: float) -> float:
    """Damage increment from one telemetry tick (Miner's rule fragment)."""
    strength = effective_strength_mpa(current_degradation)
    if strength <= 0.0:
        return 0.0
    applied = bending_stress_mpa(thrust_newtons)
    if applied <= 0.0:
        return 0.0
    stress_ratio = applied / strength
    if stress_ratio >= 1.0:
        return 1.0
    cycles_to_failure = (1.0 / stress_ratio) ** ONYX_FATIGUE_EXPONENT
    if cycles_to_failure <= 0.0:
        return 0.0
    return (1.0 / cycles_to_failure) / DEGRADATION_PER_CYCLE_BASE
