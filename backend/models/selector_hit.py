from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class SelectorHit(SQLModel, table=True):
    """Persisted match between a selector and a source (recomputed at each scan to avoid re-parsing text on every read; powers per-source hit counters)."""

    __tablename__ = "selector_hits"
    __table_args__ = (
        UniqueConstraint("id_selector", "id_source", name="uq_hit_selector_source"),
    )

    id_hit: Optional[int] = Field(default=None, primary_key=True)
    id_investigation: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("investigations.id_investigation", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    id_selector: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("investigation_selectors.id_selector", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    id_source: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("investigation_sources.id_source", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    occurrences: int = Field(sa_column=Column(Integer, nullable=False))
    snippet: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    computed_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
