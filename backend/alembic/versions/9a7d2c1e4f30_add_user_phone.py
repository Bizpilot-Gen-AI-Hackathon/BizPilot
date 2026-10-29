"""add phone to users

Revision ID: 9a7d2c1e4f30
Revises: 16c2264d9964
Create Date: 2026-10-29 14:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9a7d2c1e4f30"
down_revision: Union[str, Sequence[str], None] = "16c2264d9964"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=20), nullable=True))
    op.create_index(op.f("ix_users_phone"), "users", ["phone"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_phone"), table_name="users")
    op.drop_column("users", "phone")
