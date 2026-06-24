"""seed default roles

Revision ID: a3b5c7d9e1f2
Revises: 1e7d2ecab214
Create Date: 2026-02-09 16:30:00.000000

"""
from typing import Sequence, Union
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a3b5c7d9e1f2'
down_revision: Union[str, Sequence[str], None] = '1e7d2ecab214'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ROLES = [
    {"name": "super-admin", "description": "Super administrateur avec tous les droits"},
    {"name": "admin", "description": "Administrateur de la plateforme"},
    {"name": "user", "description": "Utilisateur standard"},
]


def upgrade() -> None:
    """Goal: seed the default roles (super-admin, admin, user). Input: none. Output: None."""
    roles_table = sa.table(
        'roles',
        sa.column('name', sa.String),
        sa.column('description', sa.String),
        sa.column('created_at', sa.DateTime(timezone=True)),
    )

    now = datetime.now(timezone.utc)
    op.bulk_insert(roles_table, [
        {"name": r["name"], "description": r["description"], "created_at": now}
        for r in ROLES
    ])


def downgrade() -> None:
    """Goal: delete the default roles. Input: none. Output: None."""
    op.execute(
        sa.text("DELETE FROM roles WHERE name IN ('super-admin', 'admin', 'user')")
    )
