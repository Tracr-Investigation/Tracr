"""add notes column to investigation_sources

Revision ID: m7n8o9p0q1r2
Revises: l6m7n8o9p0q1
Create Date: 2026-06-15 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'm7n8o9p0q1r2'
down_revision: Union[str, Sequence[str], None] = 'l6m7n8o9p0q1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: add the notes column to investigation_sources. Input: none. Output: None."""
    op.add_column('investigation_sources', sa.Column('notes', sa.Text(), nullable=True))


def downgrade() -> None:
    """Goal: drop the notes column from investigation_sources. Input: none. Output: None."""
    op.drop_column('investigation_sources', 'notes')
