from src.schemas.drone_schema import DroneCreate, DroneUpdate


def test_drone_create_schema():
    data = DroneCreate(name="test-drone", mass_kg=1.2, arm_length_m=0.25)
    assert data.name == "test-drone"
    assert data.mass_kg == 1.2


def test_drone_update_partial():
    data = DroneUpdate(name="updated-name")
    dumped = data.model_dump(exclude_unset=True)
    assert "name" in dumped
    assert "mass_kg" not in dumped
