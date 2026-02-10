from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime
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
