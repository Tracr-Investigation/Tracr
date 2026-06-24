"""add roles and user_roles tables

Revision ID: 1e7d2ecab214
Revises: 007f1ada872c
Create Date: 2026-02-09 16:06:53.687394

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '1e7d2ecab214'
down_revision: Union[str, Sequence[str], None] = '007f1ada872c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: create the roles and user_roles (users<->roles link) tables + indexes. Input: none. Output: None."""
    op.create_table(
        'roles',
        sa.Column('id_role', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=True)

    op.create_table(
        'user_roles',
        sa.Column('id_user_role', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('id_user', sa.Integer(), sa.ForeignKey('users.id_user', ondelete='CASCADE'), nullable=False),
        sa.Column('id_role', sa.Integer(), sa.ForeignKey('roles.id_role', ondelete='CASCADE'), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('assigned_by', sa.Integer(), sa.ForeignKey('users.id_user', ondelete='SET NULL'), nullable=True),
    )
    op.create_index(op.f('ix_user_roles_id_user'), 'user_roles', ['id_user'])
    op.create_index(op.f('ix_user_roles_id_role'), 'user_roles', ['id_role'])


def downgrade() -> None:
    """Goal: drop the user_roles and roles tables and their indexes. Input: none. Output: None."""
    op.drop_index(op.f('ix_user_roles_id_role'), table_name='user_roles')
    op.drop_index(op.f('ix_user_roles_id_user'), table_name='user_roles')
    op.drop_table('user_roles')
    op.drop_index(op.f('ix_roles_name'), table_name='roles')
    op.drop_table('roles')
