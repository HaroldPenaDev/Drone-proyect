from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import ASYNCHRONOUS

from src.config import SimulatorSettings
from src.models.drone_state import DroneState


class InfluxDBWriter:
    def __init__(self, settings: SimulatorSettings) -> None:
        self._client: InfluxDBClient = InfluxDBClient(
            url=settings.influxdb_url,
            token=settings.influxdb_token,
            org=settings.influxdb_org,
        )
        self._write_api = self._client.write_api(write_options=ASYNCHRONOUS)
        self._bucket: str = settings.influxdb_bucket
        self._org: str = settings.influxdb_org

    def write_state(
        self,
        state: DroneState,
        drone_id: str,
        movement: str = "hover",
    ) -> None:
        points: list[Point] = []
        for i in range(4):
            motor = state.motors[i]
            material = state.material_states[i]
            safety = state.safety_factors[i]
            point = (
                Point("arm_telemetry")
                .tag("drone_id", drone_id)
                .tag("arm_index", str(i))
                .field("thrust", motor.thrust_newtons)
                .field("torque", motor.torque_nm)
                .field("safety_factor", safety)
                .field("degradation_factor", material.degradation_factor)
                .field("rpm", motor.rpm)
                .time(int(state.timestamp * 1e9), WritePrecision.NS)
            )
            points.append(point)

        position_point = (
            Point("drone_position")
            .tag("drone_id", drone_id)
            .tag("movement", movement)
            .field("x", float(state.position[0]))
            .field("y", float(state.position[1]))
            .field("z", float(state.position[2]))
            .field("roll", float(state.orientation[0]))
            .field("pitch", float(state.orientation[1]))
            .field("yaw", float(state.orientation[2]))
            .time(int(state.timestamp * 1e9), WritePrecision.NS)
        )
        points.append(position_point)

        self._write_api.write(bucket=self._bucket, org=self._org, record=points)

    def close(self) -> None:
        self._write_api.close()
        self._client.close()
