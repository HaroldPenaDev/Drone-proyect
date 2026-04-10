from enum import Enum

import numpy as np
from numpy.typing import NDArray

from src.constants.drone_specs import DRONE_MASS_KG, GRAVITY_M_S2, ARM_LENGTH_M


class Movement(str, Enum):
    HOVER = "hover"
    ASCEND = "ascend"
    DESCEND = "descend"
    LEFT = "left"
    RIGHT = "right"
    FORWARD = "forward"
    BACKWARD = "backward"
    CLOCKWISE = "clockwise"
    COUNTERCLOCKWISE = "counterclockwise"


MAX_THRUST_PER_MOTOR_N: float = 8.0
MIN_THRUST_PER_MOTOR_N: float = 0.0
MAX_RPM: float = 12000.0
HOVER_THRUST_N: float = (DRONE_MASS_KG * GRAVITY_M_S2) / 4.0

MOTOR_POSITIONS: list[NDArray[np.float64]] = [
    np.array([ARM_LENGTH_M, 0.0, 0.0]),
    np.array([0.0, ARM_LENGTH_M, 0.0]),
    np.array([-ARM_LENGTH_M, 0.0, 0.0]),
    np.array([0.0, -ARM_LENGTH_M, 0.0]),
]

MOTOR_SPIN_DIRECTIONS: list[float] = [1.0, -1.0, 1.0, -1.0]

THRUST_MULTIPLIERS: dict[Movement, list[float]] = {
    Movement.HOVER: [1.0, 1.0, 1.0, 1.0],
    Movement.ASCEND: [1.2, 1.2, 1.2, 1.2],
    Movement.DESCEND: [0.8, 0.8, 0.8, 0.8],
    Movement.LEFT: [1.3, 0.7, 0.7, 1.3],
    Movement.RIGHT: [0.7, 1.3, 1.3, 0.7],
    Movement.FORWARD: [0.7, 0.7, 1.3, 1.3],
    Movement.BACKWARD: [1.3, 1.3, 0.7, 0.7],
    Movement.CLOCKWISE: [1.15, 0.85, 1.15, 0.85],
    Movement.COUNTERCLOCKWISE: [0.85, 1.15, 0.85, 1.15],
}
