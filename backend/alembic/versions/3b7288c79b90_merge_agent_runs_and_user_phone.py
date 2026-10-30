"""merge agent runs and user phone

Revision ID: 3b7288c79b90
Revises: 2b7c1d9e8a10, 9a7d2c1e4f30
Create Date: 2026-10-31 00:01:35.707243

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b7288c79b90'
down_revision: Union[str, Sequence[str], None] = ('2b7c1d9e8a10', '9a7d2c1e4f30')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
