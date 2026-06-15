"""add investigation_selectors table

Revision ID: l6m7n8o9p0q1
Revises: k5l6m7n8o9p0
Create Date: 2026-06-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'l6m7n8o9p0q1'
down_revision: Union[str, Sequence[str], None] = 'k5l6m7n8o9p0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'investigation_selectors',
        sa.Column('id_selector', sa.Integer(), nullable=False),
        sa.Column('id_investigation', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('selector_type', sa.String(length=30), nullable=False),
        sa.Column('value', sa.String(length=500), nullable=False),
        sa.Column('normalized_value', sa.String(length=500), nullable=False),
        sa.Column('label', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['id_investigation'], ['investigations.id_investigation'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id_user'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id_selector'),
        sa.UniqueConstraint('id_investigation', 'selector_type', 'normalized_value', name='uq_selector_per_investigation'),
    )
    op.create_index(op.f('ix_investigation_selectors_id_investigation'), 'investigation_selectors', ['id_investigation'])
    op.create_index(op.f('ix_investigation_selectors_created_by'), 'investigation_selectors', ['created_by'])
    op.create_index(op.f('ix_investigation_selectors_normalized_value'), 'investigation_selectors', ['normalized_value'])


def downgrade() -> None:
    op.drop_index(op.f('ix_investigation_selectors_normalized_value'), table_name='investigation_selectors')
    op.drop_index(op.f('ix_investigation_selectors_created_by'), table_name='investigation_selectors')
    op.drop_index(op.f('ix_investigation_selectors_id_investigation'), table_name='investigation_selectors')
    op.drop_table('investigation_selectors')
