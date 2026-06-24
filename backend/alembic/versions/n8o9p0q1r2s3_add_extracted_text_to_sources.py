"""add extracted_text and text_status to investigation_sources

Revision ID: n8o9p0q1r2s3
Revises: m7n8o9p0q1r2
Create Date: 2026-06-15 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'n8o9p0q1r2s3'
down_revision: Union[str, Sequence[str], None] = 'm7n8o9p0q1r2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: add extracted_text and text_status to investigation_sources, mark existing sources 'unprocessed'. Input: none. Output: None."""
    op.add_column('investigation_sources', sa.Column('extracted_text', sa.Text(), nullable=True))
    op.add_column(
        'investigation_sources',
        sa.Column('text_status', sa.String(length=20), nullable=False, server_default='none'),
    )
    # Les sources deja en base n'ont pas encore ete analysees : on les marque pour
    # extraction paresseuse au premier scan (cf. source_service.ensure_extracted_text).
    op.execute("UPDATE investigation_sources SET text_status = 'unprocessed'")


def downgrade() -> None:
    """Goal: drop the extracted_text and text_status columns. Input: none. Output: None."""
    op.drop_column('investigation_sources', 'text_status')
    op.drop_column('investigation_sources', 'extracted_text')
