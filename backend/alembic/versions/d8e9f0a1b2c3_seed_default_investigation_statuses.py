"""seed default investigation statuses

Revision ID: d8e9f0a1b2c3
Revises: c3d4e5f6a7b8
Create Date: 2026-04-28 11:30:00.000000

"""
from typing import Sequence, Union
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8e9f0a1b2c3'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# id_status implicite (auto-incrémenté dans l'ordre d'insertion)
# Le code applicatif (services/investigation_service.py:DEFAULT_STATUS_ID = 4)
# attend que le statut "Nouveau" ait l'id 4.
STATUSES = [
    {"name": "En cours",  "color": "#f59e0b"},   # id=1
    {"name": "Suspendue", "color": "#6b7280"},   # id=2
    {"name": "Clôturée",  "color": "#10b981"},   # id=3
    {"name": "Nouveau",   "color": "#3b82f6"},   # id=4 ← défaut
]


def upgrade() -> None:
    statuses_table = sa.table(
        'investigation_statuses',
        sa.column('name', sa.String),
        sa.column('color', sa.String),
        sa.column('created_at', sa.DateTime(timezone=True)),
    )

    now = datetime.now(timezone.utc)
    op.bulk_insert(statuses_table, [
        {"name": s["name"], "color": s["color"], "created_at": now}
        for s in STATUSES
    ])


def downgrade() -> None:
    names = tuple(s["name"] for s in STATUSES)
    op.execute(
        sa.text("DELETE FROM investigation_statuses WHERE name IN :names")
        .bindparams(sa.bindparam("names", expanding=True))
        .params(names=names)
    )
