"""add template_categories table and fk on templates

Revision ID: g1h2i3j4k5l6
Revises: c1d2e3f4a5b6
Create Date: 2026-05-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'g1h2i3j4k5l6'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── template_categories ─────────────────────────────────────
    op.create_table(
        'template_categories',
        sa.Column('id_category_template', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id_category_template'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_template_categories_name'), 'template_categories', ['name'])

    # ── FK on templates ─────────────────────────────────────────
    op.add_column('templates', sa.Column('id_category_template', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_templates_category',
        'templates', 'template_categories',
        ['id_category_template'], ['id_category_template'],
        ondelete='SET NULL',
    )
    op.create_index(op.f('ix_templates_id_category_template'), 'templates', ['id_category_template'])


def downgrade() -> None:
    op.drop_index(op.f('ix_templates_id_category_template'), table_name='templates')
    op.drop_constraint('fk_templates_category', 'templates', type_='foreignkey')
    op.drop_column('templates', 'id_category_template')
    op.drop_index(op.f('ix_template_categories_name'), table_name='template_categories')
    op.drop_table('template_categories')
