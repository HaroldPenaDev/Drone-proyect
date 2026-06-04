from dataclasses import dataclass, field
from typing import Tuple
import time

# numpy: librería para trabajar con vectores y matrices de forma rápida.
# Aquí la usamos para guardar posición, velocidad, etc. del dron como
# vectores de 3 números, y np.zeros(3) crea uno lleno de ceros.
import numpy as np
# Etiqueta de tipo para indicar "vector de numpy con decimales".
from numpy.typing import NDArray

from src.models.motor import Motor
from src.models.material import Material


@dataclass(frozen=True)
class DroneState:
    position: NDArray[np.float64] = field(default_factory=lambda: np.zeros(3))
    velocity: NDArray[np.float64] = field(default_factory=lambda: np.zeros(3))
    acceleration: NDArray[np.float64] = field(default_factory=lambda: np.zeros(3))
    orientation: NDArray[np.float64] = field(default_factory=lambda: np.zeros(3))
    angular_velocity: NDArray[np.float64] = field(default_factory=lambda: np.zeros(3))
    motors: Tuple[Motor, Motor, Motor, Motor] = field(
        default_factory=lambda: tuple(Motor.idle(i) for i in range(4))
    )
    material_states: Tuple[Material, Material, Material, Material] = field(
        default_factory=lambda: tuple(Material() for _ in range(4))
    )
    safety_factors: Tuple[float, float, float, float] = field(
        default_factory=lambda: (10.0, 10.0, 10.0, 10.0)
    )
    timestamp: float = field(default_factory=time.time)

    @staticmethod
    def hovering(altitude: float = 1.0) -> "DroneState":
        return DroneState(
            position=np.array([0.0, 0.0, altitude]),
        )

    @staticmethod
    def fresh(altitude: float = 1.0) -> "DroneState":
        """Full reset: physics + materials + safety factors all back to defaults."""
        return DroneState(
            position=np.array([0.0, 0.0, altitude]),
            velocity=np.zeros(3),
            acceleration=np.zeros(3),
            orientation=np.zeros(3),
            angular_velocity=np.zeros(3),
            motors=tuple(Motor.idle(i) for i in range(4)),
            material_states=tuple(Material() for _ in range(4)),
            safety_factors=(10.0, 10.0, 10.0, 10.0),
        )
