import time
from typing import Tuple

# numpy: librería para trabajar con vectores y matrices de forma rápida.
import numpy as np
# Etiqueta de tipo para indicar "vector de numpy con decimales".
from numpy.typing import NDArray
# scipy.solve_ivp: simula cómo cambia el dron en el tiempo a partir de sus fuerzas.
from scipy.integrate import solve_ivp
# scipy.Rotation: convierte ángulos de inclinación en algo que rota vectores en 3D.
from scipy.spatial.transform import Rotation

from src.models.drone_state import DroneState
from src.models.motor import Motor
from src.constants.drone_specs import (
    DRONE_MASS_KG,
    GRAVITY_M_S2,
    INERTIA_XX,
    INERTIA_YY,
    INERTIA_ZZ,
)
from src.constants.motor_specs import (
    Movement,
    HOVER_THRUST_N,
    THRUST_MULTIPLIERS,
    MOTOR_POSITIONS,
    MOTOR_SPIN_DIRECTIONS,
    MAX_RPM,
)


def compute_torque_from_thrust(thrust: float) -> float:
    return 0.009 * thrust**2 + 0.145 * thrust + 0.0005


def compute_rpm_from_thrust(thrust: float) -> float:
    return min((thrust / 8.0) * MAX_RPM, MAX_RPM)


def compute_motors_for_test(
    throttles: list[float],
) -> Tuple[Motor, Motor, Motor, Motor]:
    """Build 4 motors from explicit throttle values (0.0 = 0%, 1.0 = 100%)."""
    from src.constants.motor_specs import MAX_THRUST_PER_MOTOR_N
    motors: list[Motor] = []
    for i in range(4):
        t = max(0.0, min(1.0, throttles[i]))
        thrust: float = t * MAX_THRUST_PER_MOTOR_N
        motors.append(
            Motor(
                arm_index=i,
                thrust_newtons=thrust,
                torque_nm=compute_torque_from_thrust(thrust),
                rpm=compute_rpm_from_thrust(thrust),
            )
        )
    return (motors[0], motors[1], motors[2], motors[3])


def compute_motors_for_movement(
    movement: Movement,
) -> Tuple[Motor, Motor, Motor, Motor]:
    multipliers: list[float] = THRUST_MULTIPLIERS[movement]
    motors: list[Motor] = []
    for i in range(4):
        thrust: float = HOVER_THRUST_N * multipliers[i]
        motors.append(
            Motor(
                arm_index=i,
                thrust_newtons=thrust,
                torque_nm=compute_torque_from_thrust(thrust),
                rpm=compute_rpm_from_thrust(thrust),
            )
        )
    return (motors[0], motors[1], motors[2], motors[3])


# Aquí usamos scipy para armar una matriz de rotación a partir de los ángulos
# de inclinación del dron, que después servirá para rotar vectores.
def _build_rotation_matrix(orientation: NDArray[np.float64]) -> NDArray[np.float64]:
    return Rotation.from_euler(
        "ZYX", [orientation[2], orientation[1], orientation[0]]
    ).as_matrix()


# Aquí leemos los valores del estado actual y al final usamos numpy para
# devolver un vector con cómo está cambiando el dron en este instante.
def _derivatives(
    _t: float,
    state_vector: NDArray[np.float64],
    total_force: NDArray[np.float64],
    total_torque: NDArray[np.float64],
) -> NDArray[np.float64]:
    vx, vy, vz = state_vector[3], state_vector[4], state_vector[5]
    wx, wy, wz = state_vector[9], state_vector[10], state_vector[11]
    ax: float = total_force[0] / DRONE_MASS_KG
    ay: float = total_force[1] / DRONE_MASS_KG
    az: float = total_force[2] / DRONE_MASS_KG
    alpha_x: float = total_torque[0] / INERTIA_XX
    alpha_y: float = total_torque[1] / INERTIA_YY
    alpha_z: float = total_torque[2] / INERTIA_ZZ
    return np.array([vx, vy, vz, ax, ay, az, wx, wy, wz, alpha_x, alpha_y, alpha_z])


# Función principal: avanza el estado del dron un instante en el tiempo,
# apoyándose en numpy para los vectores y en scipy para la simulación.
def integrate_state(
    state: DroneState,
    movement: Movement,
    dt: float,
    motor_throttles: list[float] | None = None,
) -> DroneState:
    if motor_throttles is not None:
        motors: Tuple[Motor, Motor, Motor, Motor] = compute_motors_for_test(motor_throttles)
    else:
        motors = compute_motors_for_movement(movement)
    rotation: NDArray[np.float64] = _build_rotation_matrix(state.orientation)
    # Usamos numpy para crear los vectores iniciales de fuerza y torque.
    gravity: NDArray[np.float64] = np.array([0.0, 0.0, -DRONE_MASS_KG * GRAVITY_M_S2])
    total_force: NDArray[np.float64] = gravity.copy()
    total_torque: NDArray[np.float64] = np.zeros(3)

    # Aquí usamos numpy para sumar fuerzas, rotar vectores con @ y calcular
    # torques con cross, recorriendo los 4 motores del dron.
    for i, motor in enumerate(motors):
        thrust_body: NDArray[np.float64] = np.array([0.0, 0.0, motor.thrust_newtons])
        thrust_world: NDArray[np.float64] = rotation @ thrust_body
        total_force = total_force + thrust_world
        arm_torque: NDArray[np.float64] = np.cross(MOTOR_POSITIONS[i], thrust_body)
        reaction_torque: NDArray[np.float64] = np.array(
            [0.0, 0.0, MOTOR_SPIN_DIRECTIONS[i] * motor.torque_nm]
        )
        total_torque = total_torque + arm_torque + reaction_torque

    # Aquí juntamos todo el estado del dron en un solo vector con numpy,
    # porque scipy lo necesita así para poder simular el siguiente paso.
    state_vector: NDArray[np.float64] = np.concatenate([
        state.position, state.velocity, state.orientation, state.angular_velocity
    ])

    # Aquí scipy simula el movimiento del dron entre el tiempo 0 y dt usando
    # las fuerzas y torques calculados, y devuelve cómo quedó al final.
    solution = solve_ivp(
        fun=lambda t, y: _derivatives(t, y, total_force, total_torque),
        t_span=(0.0, dt),
        y0=state_vector,
        method="RK45",
        max_step=0.01,
    )

    # Aquí usamos numpy para sacar los pedazos del vector resultado:
    # posición, velocidad, orientación y velocidad angular.
    final: NDArray[np.float64] = solution.y[:, -1]
    new_position: NDArray[np.float64] = final[0:3]
    new_velocity: NDArray[np.float64] = final[3:6]
    new_orientation: NDArray[np.float64] = final[6:9]
    new_angular_velocity: NDArray[np.float64] = final[9:12]
    new_acceleration: NDArray[np.float64] = total_force / DRONE_MASS_KG

    if motor_throttles is not None:
        # Test bench mode: drone is bolted down, physics do not change position
        new_position = state.position
        new_velocity = np.zeros(3)
        new_orientation = state.orientation
        new_angular_velocity = np.zeros(3)
        new_acceleration = np.zeros(3)
    else:
        new_position[2] = max(new_position[2], 0.0)

    return DroneState(
        position=new_position,
        velocity=new_velocity,
        acceleration=new_acceleration,
        orientation=new_orientation,
        angular_velocity=new_angular_velocity,
        motors=motors,
        material_states=state.material_states,
        safety_factors=state.safety_factors,
        timestamp=time.time(),
    )
