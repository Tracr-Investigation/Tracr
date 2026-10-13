import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, Uuid
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class Template(SQLModel, table=True):
    """Reusable document template (optionally public, optionally categorized)."""

    __tablename__ = "templates"

    id_template: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
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
    id_category_template: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(
            Uuid,
            ForeignKey("template_categories.id_category_template", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
    created_by: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(
            Uuid,
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
