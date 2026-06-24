"""add_tasks_tables

Revision ID: f1a2b3c4d5e6
Revises: d7194cc2068c
Create Date: 2026-02-20 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'd7194cc2068c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: create the tasks and task_responses tables (+ status/priority enums). Input: none. Output: None."""
    op.create_table(
        'tasks',
        sa.Column('id_task', sa.Integer(), nullable=False),
        sa.Column('id_investigation', sa.Integer(), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column(
            'status',
            sa.Enum('todo', 'en_cours', 'termine', name='task_status_enum'),
            nullable=False,
            server_default='todo',
        ),
        sa.Column(
            'priority',
            sa.Enum('basse', 'normale', 'haute', 'urgente', name='task_priority_enum'),
            nullable=False,
            server_default='normale',
        ),
        sa.Column('is_private', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['id_investigation'], ['investigations.id_investigation'], ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id_user'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id_user'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id_task'),
    )
    op.create_index(op.f('ix_tasks_id_investigation'), 'tasks', ['id_investigation'], unique=False)
    op.create_index(op.f('ix_tasks_created_by'), 'tasks', ['created_by'], unique=False)
    op.create_index(op.f('ix_tasks_assigned_to'), 'tasks', ['assigned_to'], unique=False)

    op.create_table(
        'task_responses',
        sa.Column('id_response', sa.Integer(), nullable=False),
        sa.Column('id_task', sa.Integer(), nullable=False),
        sa.Column('id_user', sa.Integer(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['id_task'], ['tasks.id_task'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_user'], ['users.id_user'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id_response'),
    )
    op.create_index(op.f('ix_task_responses_id_task'), 'task_responses', ['id_task'], unique=False)
    op.create_index(op.f('ix_task_responses_id_user'), 'task_responses', ['id_user'], unique=False)


def downgrade() -> None:
    """Goal: drop task_responses, tasks and the associated enum types. Input: none. Output: None."""
    op.drop_index(op.f('ix_task_responses_id_user'), table_name='task_responses')
    op.drop_index(op.f('ix_task_responses_id_task'), table_name='task_responses')
    op.drop_table('task_responses')
    op.drop_index(op.f('ix_tasks_assigned_to'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_created_by'), table_name='tasks')
    op.drop_index(op.f('ix_tasks_id_investigation'), table_name='tasks')
    op.drop_table('tasks')
    op.execute("DROP TYPE IF EXISTS task_status_enum")
    op.execute("DROP TYPE IF EXISTS task_priority_enum")
