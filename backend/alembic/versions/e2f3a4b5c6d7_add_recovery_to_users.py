"""add recovery to users

Revision ID: e2f3a4b5c6d7
Revises: c3d4e5f6a7b8
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('recovery_hash', sa.String(256), nullable=True))
    op.add_column('users', sa.Column('recovery_created_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'recovery_created_at')
    op.drop_column('users', 'recovery_hash')
