"""add report summary and document control fields to documents

Revision ID: u5v6w7x8y9z0
Revises: t4u5v6w7x8y9
Create Date: 2026-10-13 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'u5v6w7x8y9z0'
down_revision: Union[str, Sequence[str], None] = 't4u5v6w7x8y9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: add summary/version/reviewer/validated_at/distribution columns to documents. Input: none. Output: None."""
    op.add_column('documents', sa.Column('summary', sa.Text(), nullable=True))
    op.add_column('documents', sa.Column('version', sa.String(length=50), nullable=True))
    op.add_column('documents', sa.Column('reviewer', sa.String(length=100), nullable=True))
    op.add_column('documents', sa.Column('validated_at', sa.Date(), nullable=True))
    op.add_column('documents', sa.Column('distribution', sa.Text(), nullable=True))


def downgrade() -> None:
    """Goal: drop the report summary and document control columns from documents. Input: none. Output: None."""
    for column in ('distribution', 'validated_at', 'reviewer', 'version', 'summary'):
        op.drop_column('documents', column)
