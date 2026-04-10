import numpy as np
import pytest

from src.models.drone_state import DroneState
from src.constants.motor_specs import Movement
from src.engines.physics_engine import (
    compute_torque_from_thrust,
    compute_motors_for_movement,
    integrate_state,
)


def test_torque_polynomial_at_zero():
    result = compute_torque_from_thrust(0.0)
    assert abs(result - 0.0005) < 1e-6


def test_torque_polynomial_positive():
    thrust = 3.0
    expected = 0.009 * 9.0 + 0.145 * 3.0 + 0.0005
    result = compute_torque_from_thrust(thrust)
    assert abs(result - expected) < 1e-6


def test_hover_motors_equal_thrust():
    motors = compute_motors_for_movement(Movement.HOVER)
    thrusts = [m.thrust_newtons for m in motors]
    assert all(abs(t - thrusts[0]) < 1e-6 for t in thrusts)


def test_ascend_motors_higher_than_hover():
    hover = compute_motors_for_movement(Movement.HOVER)
    ascend = compute_motors_for_movement(Movement.ASCEND)
    for h, a in zip(hover, ascend):
        assert a.thrust_newtons > h.thrust_newtons


def test_integrate_hover_maintains_altitude():
    state = DroneState.hovering(altitude=5.0)
    new_state = integrate_state(state, Movement.HOVER, 0.5)
    assert abs(new_state.position[2] - 5.0) < 0.5


def test_integrate_ascend_increases_altitude():
    state = DroneState.hovering(altitude=5.0)
    new_state = integrate_state(state, Movement.ASCEND, 0.5)
    assert new_state.position[2] >= 5.0
