import asyncio
import signal
import logging
import random
import time
import json

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


def _parse_movement(raw: str, dt: float, default_seconds: float = 4.0):
    """Parse 'action' o 'action:seconds' -> (Movement, ciclos).

    Retrocompatible: una acción sin ':' usa la duración por defecto.
    Devuelve None si la acción no es válida (se ignora).
    """
    name, sep, secs = raw.partition(":")
    seconds = default_seconds
    if sep and secs:
        try:
            seconds = float(secs)
        except ValueError:
            seconds = default_seconds
    seconds = max(0.5, min(120.0, seconds))
    try:
        movement = Movement(name)
    except ValueError:
        return None
    return movement, max(1, int(round(seconds / dt)))


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
    current_movement_cycles: list[int] = []  # ciclos que dura cada acción
    movement_index = 0
    movement_cycle_count = 0
    motor_test_throttles: list[float] | None = None  # None = normal mission
    current_mission_efficiency: list[float] = [1.0, 1.0, 1.0, 1.0]  # perfil de motores
    DEFAULT_CYCLES_PER_MOVEMENT = int(4.0 / dt)  # fallback: 4 s por acción

    logger.info("Simulator started for drone %s", settings.simulator_drone_id)

    while not shutdown_event.is_set():
        # 1. Check for mission if not currently running one
        if not current_mission_id:
            mission = await reader.get_active_mission(drone_uuid)
            if mission:
                current_mission_id = mission["id"]
                raw_movements = mission["movements"]
                # Detect special first element (JSON): motor_test bench, o perfil
                # de motores (flight_config) para una misión de vuelo.
                motor_test_throttles = None
                current_mission_efficiency = [1.0, 1.0, 1.0, 1.0]
                action_movements = raw_movements
                if raw_movements and isinstance(raw_movements[0], str):
                    try:
                        first = json.loads(raw_movements[0])
                    except (json.JSONDecodeError, ValueError):
                        first = None
                    if isinstance(first, dict) and first.get("type") == "motor_test":
                        motor_test_throttles = [
                            float(first.get("m1", 0.0)),
                            float(first.get("m2", 0.0)),
                            float(first.get("m3", 0.0)),
                            float(first.get("m4", 0.0)),
                        ]
                        current_mission_movements = [Movement.HOVER]  # placeholder
                        current_movement_cycles = [DEFAULT_CYCLES_PER_MOVEMENT]
                        logger.info(
                            "Motor Test Mission %s | Throttles: M1=%.0f%% M2=%.0f%% M3=%.0f%% M4=%.0f%%",
                            current_mission_id,
                            motor_test_throttles[0]*100, motor_test_throttles[1]*100,
                            motor_test_throttles[2]*100, motor_test_throttles[3]*100,
                        )
                    elif isinstance(first, dict) and first.get("type") == "flight_config":
                        raw_eff = first.get("eff") or [1.0, 1.0, 1.0, 1.0]
                        current_mission_efficiency = [
                            max(0.0, min(2.0, float(e))) for e in list(raw_eff)[:4]
                        ]
                        action_movements = raw_movements[1:]
                        logger.info(
                            "Flight mission %s | Motor efficiency: %s",
                            current_mission_id, current_mission_efficiency,
                        )
                if motor_test_throttles is None:
                    parsed = [
                        p for p in (_parse_movement(m, dt) for m in action_movements)
                        if p is not None
                    ]
                    if not parsed:
                        parsed = [(Movement.HOVER, DEFAULT_CYCLES_PER_MOVEMENT)]
                    current_mission_movements = [p[0] for p in parsed]
                    current_movement_cycles = [p[1] for p in parsed]
                movement_index = 0
                movement_cycle_count = 0
                state = DroneState.fresh()  # Reset full state per-mission (physics + materials)
                logger.info("Starting mission %s with %d movements", current_mission_id, len(current_mission_movements))

        # 2. Pick movement
        if current_mission_id:
            # Check if mission was stopped/aborted externally (every cycle for motor_test,
            # every 20 cycles for normal missions to reduce DB load)
            should_check = (motor_test_throttles is not None) or (movement_cycle_count % 20 == 0)
            if should_check:
                still_running = await reader.is_mission_still_running(current_mission_id)
                if not still_running:
                    logger.info("Mission %s was stopped externally — resetting to idle", current_mission_id)
                    current_mission_id = None
                    current_mission_movements = []
                    movement_index = 0
                    movement_cycle_count = 0
                    motor_test_throttles = None
                    state = DroneState.fresh()

        if current_mission_id:
            movement = current_mission_movements[movement_index]
            movement_cycle_count += 1
            
            # Motor test missions will now finish naturally
            # If current movement is finished (cada acción puede durar distinto)
            cycles_for_this = (
                current_movement_cycles[movement_index]
                if movement_index < len(current_movement_cycles)
                else DEFAULT_CYCLES_PER_MOVEMENT
            )
            if movement_cycle_count >= cycles_for_this:
                movement_index += 1
                movement_cycle_count = 0
            
            # If mission finished naturally
            if movement_index >= len(current_mission_movements):
                await reader.complete_mission(current_mission_id)
                current_mission_id = None
                current_mission_movements = []
                movement_index = 0
                movement_cycle_count = 0
                motor_test_throttles = None
                state = DroneState.hovering()
        else:
            movement = Movement.IDLE
            # Optional: Keeps the drone fully repaired while idling, 
            # though setting it to hovering() on completion handles this.


        # 3. Physics & Degradation
        state = integrate_state(
            state, movement, dt,
            motor_throttles=motor_test_throttles,
            motor_efficiency=current_mission_efficiency,
        )
        thrusts = tuple(m.thrust_newtons for m in state.motors)
        safety_factors = compute_all_safety_factors(state.material_states, thrusts)

        # --- Failure checks ---
        if current_mission_id:
            # 1. Structural failure: material degradation >= 1.0 (0% health left)
            structural_failure = any(m.degradation_factor >= 1.0 for m in state.material_states)
            
            # 2. Propulsion failure: thrust = 0 during flight (not applicable to motor test bench where 0% is intentional)
            propulsion_failure = False
            if motor_test_throttles is None:
                propulsion_failure = any(t == 0.0 for t in thrusts)

            if structural_failure or propulsion_failure:
                reason = "Structural failure (0% health)" if structural_failure else "Propulsion failure (0 thrust)"
                logger.warning(
                    "Failure detected during mission %s (%s) — aborting and resetting to idle",
                    current_mission_id, reason
                )
                await reader.abort_mission(current_mission_id)
                current_mission_id = None
                current_mission_movements = []
                movement_index = 0
                movement_cycle_count = 0
                motor_test_throttles = None
                state = DroneState.fresh()
                movement = Movement.IDLE
                
                # Prevent the failed thrust from instantly damaging the freshly reset drone
                thrusts = (0.0, 0.0, 0.0, 0.0)
                safety_factors = (10.0, 10.0, 10.0, 10.0)



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
