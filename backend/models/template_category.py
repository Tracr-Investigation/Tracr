from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class TemplateCategory(SQLModel, table=True):
    """Template category (label with color/icon)."""

    __tablename__ = "template_categories"

    id_category_template: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, nullable=False, sa_column_kwargs={"unique": True}, max_length=50)
    color: Optional[str] = Field(default=None, max_length=7)
    icon: Optional[str] = Field(default=None, max_length=50)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
