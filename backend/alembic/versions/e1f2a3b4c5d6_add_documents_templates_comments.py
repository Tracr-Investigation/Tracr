"""add documents, templates and document_comments tables

Revision ID: e1f2a3b4c5d6
Revises: d8e9f0a1b2c3
Create Date: 2026-04-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd8e9f0a1b2c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: create the documents, templates and document_comments tables. Input: none. Output: None."""
    # ── documents ───────────────────────────────────────────────
    op.create_table(
        'documents',
        sa.Column('id_document', sa.Integer(), nullable=False),
        sa.Column('id_investigation', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content_html', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['id_investigation'], ['investigations.id_investigation'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id_user'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id_document'),
    )
    op.create_index(op.f('ix_documents_id_investigation'), 'documents', ['id_investigation'])
    op.create_index(op.f('ix_documents_created_by'), 'documents', ['created_by'])

    # ── templates ───────────────────────────────────────────────
    op.create_table(
        'templates',
        sa.Column('id_template', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('content_html', sa.Text(), nullable=False, server_default=''),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.id_user'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id_template'),
    )
    op.create_index(op.f('ix_templates_created_by'), 'templates', ['created_by'])

    # ── document_comments ───────────────────────────────────────
    op.create_table(
        'document_comments',
        sa.Column('id_comment', sa.Integer(), nullable=False),
        sa.Column('id_document', sa.Integer(), nullable=False),
        sa.Column('comment_id', sa.String(length=64), nullable=False),
        sa.Column('quote', sa.Text(), nullable=False, server_default=''),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=True),
        sa.Column('resolved', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['id_document'], ['documents.id_document'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id_user'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id_comment'),
    )
    op.create_index(op.f('ix_document_comments_id_document'), 'document_comments', ['id_document'])
    op.create_index(op.f('ix_document_comments_comment_id'), 'document_comments', ['comment_id'])
    op.create_index(op.f('ix_document_comments_author_id'), 'document_comments', ['author_id'])


def downgrade() -> None:
    """Goal: drop the document_comments, templates and documents tables. Input: none. Output: None."""
    op.drop_index(op.f('ix_document_comments_author_id'), table_name='document_comments')
    op.drop_index(op.f('ix_document_comments_comment_id'), table_name='document_comments')
    op.drop_index(op.f('ix_document_comments_id_document'), table_name='document_comments')
    op.drop_table('document_comments')

    op.drop_index(op.f('ix_templates_created_by'), table_name='templates')
    op.drop_table('templates')

    op.drop_index(op.f('ix_documents_created_by'), table_name='documents')
    op.drop_index(op.f('ix_documents_id_investigation'), table_name='documents')
    op.drop_table('documents')
