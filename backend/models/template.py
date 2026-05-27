from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class Template(SQLModel, table=True):
    __tablename__ = "templates"

    id_template: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(
        sa_column=Column(String(255), nullable=False),
    )
    description: str = Field(
        default="",
        sa_column=Column(Text, nullable=False, server_default=""),
    )
    content_html: str = Field(
        default="",
        sa_column=Column(Text, nullable=False, server_default=""),
    )
    is_public: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, default=False),
    )
    id_category_template: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("template_categories.id_category_template", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
    created_by: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("users.id_user", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
