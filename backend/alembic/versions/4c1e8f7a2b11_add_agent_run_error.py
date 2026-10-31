"""add agent run error

Revision ID: 4c1e8f7a2b11
Revises: 3b7288c79b90
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "4c1e8f7a2b11"
down_revision: Union[str, Sequence[str], None] = "3b7288c79b90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("agent_runs", sa.Column("error", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column("agent_runs", "error")
