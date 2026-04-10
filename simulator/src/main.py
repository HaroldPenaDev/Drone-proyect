import asyncio
import signal
import logging
import random
import time

from src.config import SimulatorSettings
from src.models.drone_state import DroneState
from src.models.material import Material
from src.constants.motor_specs import Movement
from src.engines.physics_engine import integrate_state
from src.engines.structural_engine import compute_all_safety_factors
from src.engines.material_engine import compute_cycle_degradation
from src.engines.structural_engine import compute_max_bending_stress_mpa, compute_bending_moment
from src.writers.influxdb_writer import InfluxDBWriter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MOVEMENT_SEQUENCE: list[Movement] = [
    Movement.HOVER,
    Movement.ASCEND,
    Movement.HOVER,
    Movement.FORWARD,
    Movement.HOVER,
    Movement.LEFT,
    Movement.HOVER,
    Movement.CLOCKWISE,
    Movement.HOVER,
    Movement.DESCEND,
]

shutdown_event: asyncio.Event = asyncio.Event()


def _pick_movement(cycle: int) -> Movement:
    return MOVEMENT_SEQUENCE[cycle % len(MOVEMENT_SEQUENCE)]


async def simulation_loop(settings: SimulatorSettings) -> None:
    writer = InfluxDBWriter(settings)
    state = DroneState.hovering(altitude=1.0)
    dt: float = settings.simulator_interval_ms / 1000.0
    cycle: int = 0

    logger.info("Simulator started for drone %s", settings.simulator_drone_id)

    while not shutdown_event.is_set():
        movement: Movement = _pick_movement(cycle)
        state = integrate_state(state, movement, dt)

        thrusts = tuple(m.thrust_newtons for m in state.motors)
        safety_factors = compute_all_safety_factors(state.material_states, thrusts)

        new_materials: list[Material] = []
        for i in range(4):
            bm = compute_bending_moment(thrusts[i])
            stress = compute_max_bending_stress_mpa(bm)
            updated = compute_cycle_degradation(state.material_states[i], stress)
            new_materials.append(updated)

        state = DroneState(
            position=state.position,
            velocity=state.velocity,
            acceleration=state.acceleration,
            orientation=state.orientation,
            angular_velocity=state.angular_velocity,
            motors=state.motors,
            material_states=(new_materials[0], new_materials[1], new_materials[2], new_materials[3]),
            safety_factors=safety_factors,
            timestamp=time.time(),
        )

        writer.write_state(state, settings.simulator_drone_id)
        cycle += 1

        if cycle % 20 == 0:
            logger.info(
                "Cycle %d | Movement: %s | Alt: %.2f | SF: [%.2f, %.2f, %.2f, %.2f]",
                cycle,
                movement.value,
                state.position[2],
                *safety_factors,
            )

        await asyncio.sleep(dt)

    writer.close()
    logger.info("Simulator stopped")


def _handle_signal() -> None:
    shutdown_event.set()


def main() -> None:
    settings = SimulatorSettings()
    loop = asyncio.new_event_loop()
    loop.add_signal_handler(signal.SIGINT, _handle_signal)
    loop.add_signal_handler(signal.SIGTERM, _handle_signal)
    loop.run_until_complete(simulation_loop(settings))


if __name__ == "__main__":
    main()
