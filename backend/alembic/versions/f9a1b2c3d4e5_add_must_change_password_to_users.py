"""add must_change_password to users

Revision ID: f9a1b2c3d4e5
Revises: e1f2a3b4c5d6
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f9a1b2c3d4e5'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: add must_change_password to users and force it for superadmin. Input: none. Output: None."""
    op.add_column(
        'users',
        sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default='false'),
    )

    conn = op.get_bind()
    conn.execute(
        sa.text("UPDATE users SET must_change_password = true WHERE pseudo = 'superadmin'")
    )


def downgrade() -> None:
    """Goal: drop the must_change_password column from users. Input: none. Output: None."""
    op.drop_column('users', 'must_change_password')
