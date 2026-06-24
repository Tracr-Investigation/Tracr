from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class Category(SQLModel, table=True):
    """Investigation category (label with color/icon) for classifying investigations."""

    __tablename__ = "categories"

    id_category: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False, sa_column_kwargs={"unique": True}, max_length=50)
    color: Optional[str] = Field(default=None, max_length=7)
    icon: Optional[str] = Field(default=None, max_length=50)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
