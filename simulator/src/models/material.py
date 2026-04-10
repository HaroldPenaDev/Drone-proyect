from dataclasses import dataclass


@dataclass(frozen=True)
class Material:
    tensile_strength_mpa: float = 36.0
    elastic_modulus_gpa: float = 2.4
    fatigue_coefficient: float = 10.0
    degradation_factor: float = 0.0

    @property
    def effective_tensile_strength_mpa(self) -> float:
        return self.tensile_strength_mpa * (1.0 - self.degradation_factor)

    def with_degradation(self, new_degradation: float) -> "Material":
        clamped: float = min(max(new_degradation, 0.0), 1.0)
        return Material(
            tensile_strength_mpa=self.tensile_strength_mpa,
            elastic_modulus_gpa=self.elastic_modulus_gpa,
            fatigue_coefficient=self.fatigue_coefficient,
            degradation_factor=clamped,
        )
