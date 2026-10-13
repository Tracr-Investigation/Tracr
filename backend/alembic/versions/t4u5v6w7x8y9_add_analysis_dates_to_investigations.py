"""add analysis period dates to investigations

Revision ID: t4u5v6w7x8y9
Revises: s3t4u5v6w7x8
Create Date: 2026-10-13 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 't4u5v6w7x8y9'
down_revision: Union[str, Sequence[str], None] = 's3t4u5v6w7x8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: add the analysis start/end date columns to investigations. Input: none. Output: None."""
    op.add_column('investigations', sa.Column('analysis_start_date', sa.Date(), nullable=True))
    op.add_column('investigations', sa.Column('analysis_end_date', sa.Date(), nullable=True))


def downgrade() -> None:
    """Goal: drop the analysis start/end date columns from investigations. Input: none. Output: None."""
    op.drop_column('investigations', 'analysis_end_date')
    op.drop_column('investigations', 'analysis_start_date')
