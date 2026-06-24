"""fix superadmin role to super-admin

Revision ID: a1b2c3d4e5f6
Revises: f9a1b2c3d4e5
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f9a1b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: reassign the superadmin account from the admin role to super-admin. Input: none. Output: None."""
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE user_roles
        SET id_role = (SELECT id_role FROM roles WHERE name = 'super-admin')
        WHERE id_user = (SELECT id_user FROM users WHERE pseudo = 'superadmin')
          AND id_role = (SELECT id_role FROM roles WHERE name = 'admin')
    """))


def downgrade() -> None:
    """Goal: reassign the superadmin account back to the admin role. Input: none. Output: None."""
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE user_roles
        SET id_role = (SELECT id_role FROM roles WHERE name = 'admin')
        WHERE id_user = (SELECT id_user FROM users WHERE pseudo = 'superadmin')
          AND id_role = (SELECT id_role FROM roles WHERE name = 'super-admin')
    """))
