"""add role and show_in_list to investigation_sources

Revision ID: s3t4u5v6w7x8
Revises: r2s3t4u5v6w7
Create Date: 2026-06-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 's3t4u5v6w7x8'
down_revision: Union[str, Sequence[str], None] = 'r2s3t4u5v6w7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('investigation_sources', sa.Column('role', sa.String(length=20), nullable=True))
    op.add_column(
        'investigation_sources',
        sa.Column('show_in_list', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.create_index(
        'ix_investigation_sources_role', 'investigation_sources', ['role']
    )


def downgrade() -> None:
    op.drop_index('ix_investigation_sources_role', table_name='investigation_sources')
    op.drop_column('investigation_sources', 'show_in_list')
    op.drop_column('investigation_sources', 'role')
