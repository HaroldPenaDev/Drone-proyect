from dataclasses import dataclass
from typing import Literal

ImpactDirection = Literal["front", "back", "left", "right"]


@dataclass(frozen=True)
class Impact:
    direction: ImpactDirection
    height_meters: float
    contact_time_seconds: float
    force_newtons: float
