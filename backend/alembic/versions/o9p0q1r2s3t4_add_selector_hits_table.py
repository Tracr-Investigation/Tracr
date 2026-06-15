"""add selector_hits table

Revision ID: o9p0q1r2s3t4
Revises: n8o9p0q1r2s3
Create Date: 2026-06-15 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'o9p0q1r2s3t4'
down_revision: Union[str, Sequence[str], None] = 'n8o9p0q1r2s3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'selector_hits',
        sa.Column('id_hit', sa.Integer(), nullable=False),
        sa.Column('id_investigation', sa.Integer(), nullable=False),
        sa.Column('id_selector', sa.Integer(), nullable=False),
        sa.Column('id_source', sa.Integer(), nullable=False),
        sa.Column('occurrences', sa.Integer(), nullable=False),
        sa.Column('snippet', sa.Text(), nullable=True),
        sa.Column('computed_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['id_investigation'], ['investigations.id_investigation'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_selector'], ['investigation_selectors.id_selector'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_source'], ['investigation_sources.id_source'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id_hit'),
        sa.UniqueConstraint('id_selector', 'id_source', name='uq_hit_selector_source'),
    )
    op.create_index(op.f('ix_selector_hits_id_investigation'), 'selector_hits', ['id_investigation'])
    op.create_index(op.f('ix_selector_hits_id_selector'), 'selector_hits', ['id_selector'])
    op.create_index(op.f('ix_selector_hits_id_source'), 'selector_hits', ['id_source'])


def downgrade() -> None:
    op.drop_index(op.f('ix_selector_hits_id_source'), table_name='selector_hits')
    op.drop_index(op.f('ix_selector_hits_id_selector'), table_name='selector_hits')
    op.drop_index(op.f('ix_selector_hits_id_investigation'), table_name='selector_hits')
    op.drop_table('selector_hits')
