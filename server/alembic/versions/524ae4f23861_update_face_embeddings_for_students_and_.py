"""update face embeddings for students and faculty

Revision ID: 524ae4f23861
Revises: 5e6a5509f059
Create Date: 2026-08-10 14:05:56.814097

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '524ae4f23861'
down_revision: Union[str, Sequence[str], None] = '5e6a5509f059'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
