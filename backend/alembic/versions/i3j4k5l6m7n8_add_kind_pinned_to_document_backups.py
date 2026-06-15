"""add kind and pinned to document_backups

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-06-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'i3j4k5l6m7n8'
down_revision: Union[str, Sequence[str], None] = 'h2i3j4k5l6m7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # kind : 'manual' (créé par un utilisateur) ou 'auto' (sauvegarde planifiée)
    op.add_column(
        'document_backups',
        sa.Column('kind', sa.String(length=16), nullable=False, server_default='manual'),
    )
    # pinned : backup protégé, jamais purgé par la rétention
    op.add_column(
        'document_backups',
        sa.Column('pinned', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(op.f('ix_document_backups_kind'), 'document_backups', ['kind'])


def downgrade() -> None:
    op.drop_index(op.f('ix_document_backups_kind'), table_name='document_backups')
    op.drop_column('document_backups', 'pinned')
    op.drop_column('document_backups', 'kind')