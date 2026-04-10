from dataclasses import dataclass


@dataclass(frozen=True)
class Motor:
    arm_index: int
    thrust_newtons: float
    torque_nm: float
    rpm: float

    @staticmethod
    def idle(arm_index: int) -> "Motor":
        return Motor(
            arm_index=arm_index,
            thrust_newtons=0.0,
            torque_nm=0.0,
            rpm=0.0,
        )
