from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, Text
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class Entity(SQLModel, table=True):
    __tablename__ = "entities"

    id_entity: Optional[int] = Field(default=None, primary_key=True)
    id_investigation: int = Field(
        sa_column=Column(Integer, ForeignKey("investigations.id_investigation", ondelete="CASCADE"), nullable=False, index=True),
    )
    type: str = Field(max_length=50, nullable=False)
    label: str = Field(max_length=255, nullable=False)
    value: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    color: Optional[str] = Field(default=None, max_length=7)
    pos_x: Optional[float] = Field(default=None, sa_column=Column(Float, nullable=True))
    pos_y: Optional[float] = Field(default=None, sa_column=Column(Float, nullable=True))
    created_by: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("users.id_user", ondelete="SET NULL"), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
