"""add kanban statuses to task_status_enum

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2026-06-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'j4k5l6m7n8o9'
down_revision: Union[str, Sequence[str], None] = 'i3j4k5l6m7n8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Nouveaux statuts Kanban ajoutés à l'enum existant (todo, en_cours, termine)
NEW_VALUES = ("bloque", "en_revue", "a_valider")


def upgrade() -> None:
    """Goal: add the Kanban statuses (bloque, en_revue, a_valider) to the task_status_enum type. Input: none. Output: None."""
    # ALTER TYPE ... ADD VALUE ne peut pas s'exécuter dans un bloc transactionnel :
    # on bascule en autocommit le temps de l'ajout.
    with op.get_context().autocommit_block():
        for value in NEW_VALUES:
            op.execute(f"ALTER TYPE task_status_enum ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    """Goal: no-op (PostgreSQL cannot remove an enum value). Input: none. Output: None."""
    # PostgreSQL ne permet pas de retirer une valeur d'un type enum.
    # Le downgrade est volontairement un no-op : les nouveaux statuts restent
    # disponibles mais ne sont plus utilisés par l'application.
    pass
