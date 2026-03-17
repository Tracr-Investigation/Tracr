"""seed super admin user

Revision ID: b1c2d3e4f5a6
Revises: 4691e8fda8e6
Create Date: 2026-03-17 00:00:00.000000

"""
from typing import Sequence, Union
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = '4691e8fda8e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SUPER_ADMIN_PSEUDO = "superadmin"
SUPER_ADMIN_PASSWORD_HASH = "$2y$10$N6XINc9b2MuaqCe8d29E1O78dUiReA565t561Br625q1HCLBPxytu"
SUPER_ADMIN_ROLE = "admin"


def upgrade() -> None:
    conn = op.get_bind()
    now = datetime.now(timezone.utc)

    # Vérifie que l'utilisateur n'existe pas déjà
    existing = conn.execute(
        sa.text("SELECT id_user FROM users WHERE pseudo = :pseudo"),
        {"pseudo": SUPER_ADMIN_PSEUDO},
    ).fetchone()

    if existing:
        return

    # Insère le super admin
    result = conn.execute(
        sa.text(
            "INSERT INTO users (pseudo, password_hash, is_active, created_at, updated_at) "
            "VALUES (:pseudo, :password_hash, :is_active, :created_at, :updated_at) "
            "RETURNING id_user"
        ),
        {
            "pseudo": SUPER_ADMIN_PSEUDO,
            "password_hash": SUPER_ADMIN_PASSWORD_HASH,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        },
    )
    user_id = result.fetchone()[0]

    # Récupère l'id du rôle admin
    role = conn.execute(
        sa.text("SELECT id_role FROM roles WHERE name = :name"),
        {"name": SUPER_ADMIN_ROLE},
    ).fetchone()

    if role is None:
        raise RuntimeError(f"Rôle '{SUPER_ADMIN_ROLE}' introuvable. Assurez-vous que la migration a3b5c7d9e1f2 a été appliquée.")

    role_id = role[0]

    # Assigne le rôle à l'utilisateur
    conn.execute(
        sa.text(
            "INSERT INTO user_roles (id_user, id_role, assigned_at) "
            "VALUES (:id_user, :id_role, :assigned_at)"
        ),
        {
            "id_user": user_id,
            "id_role": role_id,
            "assigned_at": now,
        },
    )


def downgrade() -> None:
    conn = op.get_bind()

    user = conn.execute(
        sa.text("SELECT id_user FROM users WHERE pseudo = :pseudo"),
        {"pseudo": SUPER_ADMIN_PSEUDO},
    ).fetchone()

    if user:
        user_id = user[0]
        conn.execute(
            sa.text("DELETE FROM user_roles WHERE id_user = :id_user"),
            {"id_user": user_id},
        )
        conn.execute(
            sa.text("DELETE FROM users WHERE id_user = :id_user"),
            {"id_user": user_id},
        )