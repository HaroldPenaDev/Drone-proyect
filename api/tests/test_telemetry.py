from src.schemas.telemetry_schema import TelemetryPoint, DroneSnapshotArm


def test_telemetry_point_schema():
    point = TelemetryPoint(
        timestamp="2024-01-01T00:00:00Z",
        arm_index=0,
        thrust=3.5,
        torque=0.15,
        safety_factor=2.8,
        degradation_factor=0.02,
    )
    assert point.arm_index == 0
    assert point.thrust == 3.5


def test_drone_snapshot_arm():
    arm = DroneSnapshotArm(
        arm_index=1,
        thrust=2.9,
        torque=0.12,
        safety_factor=3.1,
        degradation_factor=0.01,
    )
    assert arm.safety_factor == 3.1
