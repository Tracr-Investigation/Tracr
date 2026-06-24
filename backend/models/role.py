from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class Role(SQLModel, table=True):
    """User role (super-admin, admin, user)."""

    __tablename__ = "roles"

    id_role: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False, sa_column_kwargs={"unique": True})
    description: Optional[str] = Field(default=None)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
