"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "drones",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(255), unique=True, nullable=False),
        sa.Column("arm_count", sa.Integer(), server_default="4"),
        sa.Column("mass_kg", sa.Float(), nullable=False),
        sa.Column("arm_length_m", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "missions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("drone_id", UUID(as_uuid=True), sa.ForeignKey("drones.id"), nullable=False),
        sa.Column("status", sa.Enum("pending", "running", "completed", "aborted", name="missionstatus"), server_default="pending"),
        sa.Column("movements", sa.JSON(), server_default="[]"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "alerts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("drone_id", UUID(as_uuid=True), sa.ForeignKey("drones.id"), nullable=False),
        sa.Column("mission_id", UUID(as_uuid=True), sa.ForeignKey("missions.id"), nullable=True),
        sa.Column("alert_type", sa.String(100), nullable=False),
        sa.Column("arm_index", sa.Integer(), nullable=False),
        sa.Column("safety_factor_value", sa.Float(), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_index("ix_missions_drone_id", "missions", ["drone_id"])
    op.create_index("ix_alerts_drone_id", "alerts", ["drone_id"])
    op.create_index("ix_alerts_created_at", "alerts", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_alerts_created_at", table_name="alerts")
    op.drop_index("ix_alerts_drone_id", table_name="alerts")
    op.drop_index("ix_missions_drone_id", table_name="missions")
    op.drop_table("alerts")
    op.drop_table("missions")
    op.drop_table("drones")
    op.execute("DROP TYPE IF EXISTS missionstatus")
