from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class InvestigationStatus(SQLModel, table=True):
    __tablename__ = "investigation_statuses"

    id_status: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False, sa_column_kwargs={"unique": True})
    color: Optional[str] = Field(default=None, max_length=7)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class Investigation(SQLModel, table=True):
    __tablename__ = "investigations"

    id_investigation: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=255, nullable=False)
    description: Optional[str] = Field(default=None)
    id_status: int = Field(
        sa_column=Column(Integer, ForeignKey("investigation_statuses.id_status", ondelete="RESTRICT"), nullable=False, index=True),
    )
    owner_id: int = Field(
        sa_column=Column(Integer, ForeignKey("users.id_user", ondelete="CASCADE"), nullable=False, index=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    closed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
