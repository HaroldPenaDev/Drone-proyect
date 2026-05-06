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
from src.readers.postgres_reader import PostgresReader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

shutdown_event: asyncio.Event = asyncio.Event()


async def simulation_loop(settings: SimulatorSettings) -> None:
    writer = InfluxDBWriter(settings)
    reader = PostgresReader(settings)
    state = DroneState.hovering(altitude=1.0)
    dt: float = settings.simulator_interval_ms / 1000.0
    
    # Resolve Drone UUID
    drone_uuid = await reader.get_drone_id_by_name(settings.simulator_drone_id)
    while not drone_uuid and not shutdown_event.is_set():
        logger.warning("Drone %s not found in database, retrying in 5s...", settings.simulator_drone_id)
        await asyncio.sleep(5)
        drone_uuid = await reader.get_drone_id_by_name(settings.simulator_drone_id)

    if shutdown_event.is_set():
        return

    logger.info("Simulator linked to drone UUID: %s", drone_uuid)
    
    # Mission management
    current_mission_id = None
    current_mission_movements = []
    movement_index = 0
    movement_cycle_count = 0
    CYCLES_PER_MOVEMENT = int(4.0 / dt)  # 4 seconds per movement

    logger.info("Simulator started for drone %s", settings.simulator_drone_id)

    while not shutdown_event.is_set():
        # 1. Check for mission if not currently running one
        if not current_mission_id:
            mission = await reader.get_active_mission(drone_uuid)
            if mission:
                current_mission_id = mission["id"]
                current_mission_movements = [Movement(m) for m in mission["movements"]]
                movement_index = 0
                movement_cycle_count = 0
                state = DroneState.hovering()
                logger.info("Starting mission %s with %d movements", current_mission_id, len(current_mission_movements))

        # 2. Pick movement
        if current_mission_id:
            movement = current_mission_movements[movement_index]
            movement_cycle_count += 1
            
            # If current movement is finished
            if movement_cycle_count >= CYCLES_PER_MOVEMENT:
                movement_index += 1
                movement_cycle_count = 0
            
            # If mission finished
            if movement_index >= len(current_mission_movements):
                await reader.complete_mission(current_mission_id)
                current_mission_id = None
                current_mission_movements = []
                movement_index = 0
                movement_cycle_count = 0
                state = DroneState.hovering()
        else:
            movement = Movement.IDLE
            # Optional: Keeps the drone fully repaired while idling, 
            # though setting it to hovering() on completion handles this.


        # 3. Physics & Degradation
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

        writer.write_state(state, str(drone_uuid))

        if current_mission_id and movement_index % 5 == 0:
            logger.info(
                "Mission Progress | Movement: %s | Alt: %.2f | SF: [%.2f, %.2f, %.2f, %.2f]",
                movement.value,
                state.position[2],
                *safety_factors,
            )

        await asyncio.sleep(dt)

    writer.close()
    await reader.close()
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
