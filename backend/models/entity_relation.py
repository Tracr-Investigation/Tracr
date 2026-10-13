import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, ForeignKey, Uuid
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class EntityRelation(SQLModel, table=True):
    """Directed link between two entities of an investigation's graph."""

    __tablename__ = "entity_relations"

    id_relation: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    id_investigation: uuid.UUID = Field(
        sa_column=Column(Uuid, ForeignKey("investigations.id_investigation", ondelete="CASCADE"), nullable=False, index=True),
    )
    source_id: uuid.UUID = Field(
        sa_column=Column(Uuid, ForeignKey("entities.id_entity", ondelete="CASCADE"), nullable=False, index=True),
    )
    target_id: uuid.UUID = Field(
        sa_column=Column(Uuid, ForeignKey("entities.id_entity", ondelete="CASCADE"), nullable=False, index=True),
    )
    label: Optional[str] = Field(default=None, max_length=100)
    created_by: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(Uuid, ForeignKey("users.id_user", ondelete="SET NULL"), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
