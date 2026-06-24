"""add document_media table

Revision ID: a2b3c4d5e6f7
Revises: e1f2a3b4c5d6
Create Date: 2026-05-04 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: create the document_media table (media attached to documents) + indexes. Input: none. Output: None."""
    op.create_table(
        'document_media',
        sa.Column('id_media', sa.Integer(), nullable=False),
        sa.Column('id_document', sa.Integer(), nullable=False),
        sa.Column('id_investigation', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(length=50), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('data', sa.Text(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['id_document'], ['documents.id_document'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_investigation'], ['investigations.id_investigation'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id_user'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id_media'),
    )
    op.create_index('ix_document_media_id_document', 'document_media', ['id_document'])
    op.create_index('ix_document_media_id_investigation', 'document_media', ['id_investigation'])


def downgrade() -> None:
    """Goal: drop the document_media table. Input: none. Output: None."""
    op.drop_index('ix_document_media_id_investigation', table_name='document_media')
    op.drop_index('ix_document_media_id_document', table_name='document_media')
    op.drop_table('document_media')
