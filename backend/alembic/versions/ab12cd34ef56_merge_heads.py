"""merge heads

Revision ID: ab12cd34ef56
Revises: e2f3a4b5c6d7, f7a8b9c0d1e2, a1b2c3d4e5f6
Create Date: 2026-05-15

"""
from typing import Sequence, Union

revision: str = 'ab12cd34ef56'
down_revision: Union[str, Sequence[str], None] = ('e2f3a4b5c6d7', 'f7a8b9c0d1e2', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Goal: merge point for the three migration branches (no-op). Input: none. Output: None."""
    pass


def downgrade() -> None:
    """Goal: no-op (nothing to revert). Input: none. Output: None."""
    pass