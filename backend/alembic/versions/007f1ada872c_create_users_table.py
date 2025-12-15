"""create users table

Revision ID: 007f1ada872c
Revises: 
Create Date: 2025-12-15 11:56:03.737978

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '007f1ada872c'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('users',
                    sa.Column('id_user', sa.Integer(), nullable=False),
                    sa.Column('pseudo', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
                    sa.Column('password_hash', sqlmodel.sql.sqltypes.AutoString(length=256), nullable=False),
                    sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
                    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
                    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
                    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
                    sa.PrimaryKeyConstraint('id_user')
                    )
    op.create_index(op.f('ix_users_pseudo'), 'users', ['pseudo'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_users_pseudo'), table_name='users')
    op.drop_table('users')
