"""add investigation_sources table

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-06-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'h2i3j4k5l6m7'
down_revision: Union[str, Sequence[str], None] = 'g1h2i3j4k5l6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: create the investigation_sources table (OSINT archival) + indexes. Input: none. Output: None."""
    op.create_table(
        'investigation_sources',
        sa.Column('id_source', sa.Integer(), nullable=False),
        sa.Column('id_investigation', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=False),
        sa.Column('source_type', sa.String(length=20), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=False),
        sa.Column('size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('storage_key', sa.String(length=512), nullable=False),
        sa.Column('capture_group', sa.String(length=36), nullable=True),
        sa.Column('page_metadata', sa.JSON(), nullable=True),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['id_investigation'], ['investigations.id_investigation'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id_user'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id_source'),
    )
    op.create_index(op.f('ix_investigation_sources_id_investigation'), 'investigation_sources', ['id_investigation'])
    op.create_index(op.f('ix_investigation_sources_created_by'), 'investigation_sources', ['created_by'])
    op.create_index(op.f('ix_investigation_sources_content_hash'), 'investigation_sources', ['content_hash'])
    op.create_index(op.f('ix_investigation_sources_capture_group'), 'investigation_sources', ['capture_group'])


def downgrade() -> None:
    """Goal: drop the investigation_sources table. Input: none. Output: None."""
    op.drop_index(op.f('ix_investigation_sources_capture_group'), table_name='investigation_sources')
    op.drop_index(op.f('ix_investigation_sources_content_hash'), table_name='investigation_sources')
    op.drop_index(op.f('ix_investigation_sources_created_by'), table_name='investigation_sources')
    op.drop_index(op.f('ix_investigation_sources_id_investigation'), table_name='investigation_sources')
    op.drop_table('investigation_sources')
