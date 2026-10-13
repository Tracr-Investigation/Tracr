import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, Float, ForeignKey, Text, Uuid
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class Entity(SQLModel, table=True):
    """Graph node of an investigation (person, org, IP, account...) with canvas position."""

    __tablename__ = "entities"

    id_entity: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    id_investigation: uuid.UUID = Field(
        sa_column=Column(Uuid, ForeignKey("investigations.id_investigation", ondelete="CASCADE"), nullable=False, index=True),
    )
    type: str = Field(max_length=50, nullable=False)
    label: str = Field(max_length=255, nullable=False)
    value: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    color: Optional[str] = Field(default=None, max_length=7)
    pos_x: Optional[float] = Field(default=None, sa_column=Column(Float, nullable=True))
    pos_y: Optional[float] = Field(default=None, sa_column=Column(Float, nullable=True))
    created_by: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(Uuid, ForeignKey("users.id_user", ondelete="SET NULL"), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
