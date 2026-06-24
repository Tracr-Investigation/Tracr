"""add cover_storage_key to investigations

Revision ID: p0q1r2s3t4u5
Revises: o9p0q1r2s3t4
Create Date: 2026-06-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'p0q1r2s3t4u5'
down_revision: Union[str, Sequence[str], None] = 'o9p0q1r2s3t4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: add cover_storage_key to investigations. Input: none. Output: None."""
    op.add_column('investigations', sa.Column('cover_storage_key', sa.String(length=512), nullable=True))


def downgrade() -> None:
    """Goal: drop the cover_storage_key column from investigations. Input: none. Output: None."""
    op.drop_column('investigations', 'cover_storage_key')