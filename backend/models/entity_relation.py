from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class EntityRelation(SQLModel, table=True):
    __tablename__ = "entity_relations"

    id_relation: Optional[int] = Field(default=None, primary_key=True)
    id_investigation: int = Field(
        sa_column=Column(Integer, ForeignKey("investigations.id_investigation", ondelete="CASCADE"), nullable=False, index=True),
    )
    source_id: int = Field(
        sa_column=Column(Integer, ForeignKey("entities.id_entity", ondelete="CASCADE"), nullable=False, index=True),
    )
    target_id: int = Field(
        sa_column=Column(Integer, ForeignKey("entities.id_entity", ondelete="CASCADE"), nullable=False, index=True),
    )
    label: Optional[str] = Field(default=None, max_length=100)
    created_by: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("users.id_user", ondelete="SET NULL"), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
