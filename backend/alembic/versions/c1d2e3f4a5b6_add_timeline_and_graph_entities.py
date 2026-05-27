"""add timeline and graph entities

Revision ID: c1d2e3f4a5b6
Revises: ab12cd34ef56
Create Date: 2026-05-18

"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'ab12cd34ef56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add id_investigation to logs table
    op.add_column('logs', sa.Column('id_investigation', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_logs_id_investigation',
        'logs', 'investigations',
        ['id_investigation'], ['id_investigation'],
        ondelete='SET NULL',
    )
    op.create_index('ix_logs_id_investigation', 'logs', ['id_investigation'])

    # Create entities table
    op.create_table(
        'entities',
        sa.Column('id_entity', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('id_investigation', sa.Integer(), sa.ForeignKey('investigations.id_investigation', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('label', sa.String(255), nullable=False),
        sa.Column('value', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('color', sa.String(7), nullable=True),
        sa.Column('pos_x', sa.Float(), nullable=True),
        sa.Column('pos_y', sa.Float(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id_user', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Create entity_relations table
    op.create_table(
        'entity_relations',
        sa.Column('id_relation', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('id_investigation', sa.Integer(), sa.ForeignKey('investigations.id_investigation', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('source_id', sa.Integer(), sa.ForeignKey('entities.id_entity', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('target_id', sa.Integer(), sa.ForeignKey('entities.id_entity', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('label', sa.String(100), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id_user', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('entity_relations')
    op.drop_table('entities')
    op.drop_index('ix_logs_id_investigation', table_name='logs')
    op.drop_constraint('fk_logs_id_investigation', 'logs', type_='foreignkey')
    op.drop_column('logs', 'id_investigation')
