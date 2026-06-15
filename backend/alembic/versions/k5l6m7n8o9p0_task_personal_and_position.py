"""make task investigation nullable and add position

Revision ID: k5l6m7n8o9p0
Revises: j4k5l6m7n8o9
Create Date: 2026-06-15 10:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'k5l6m7n8o9p0'
down_revision: Union[str, Sequence[str], None] = 'j4k5l6m7n8o9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # id_investigation NULL = tâche personnelle (rattachée à son créateur)
    op.alter_column('tasks', 'id_investigation', existing_type=sa.Integer(), nullable=True)
    # position : ordre vertical de la tâche dans sa colonne Kanban
    op.add_column(
        'tasks',
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('tasks', 'position')
    # On rétablit la contrainte NOT NULL : les tâches personnelles doivent être
    # purgées au préalable, sinon l'opération échoue.
    op.alter_column('tasks', 'id_investigation', existing_type=sa.Integer(), nullable=False)
