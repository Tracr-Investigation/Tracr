"""add document_backups table

Revision ID: f7a8b9c0d1e2
Revises: e1f2a3b4c5d6
Create Date: 2026-05-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── document_backups ────────────────────────────────────────
    op.create_table(
        'document_backups',
        sa.Column('id_backup', sa.Integer(), nullable=False),
        sa.Column('id_document', sa.Integer(), nullable=False),
        sa.Column('id_user', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content_html', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['id_document'], ['documents.id_document'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_user'], ['users.id_user'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id_backup'),
    )
    op.create_index(op.f('ix_document_backups_id_document'), 'document_backups', ['id_document'])


def downgrade() -> None:
    op.drop_index(op.f('ix_document_backups_id_document'), table_name='document_backups')
    op.drop_table('document_backups')
