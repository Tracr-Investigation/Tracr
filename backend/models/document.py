from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id_document: Optional[int] = Field(default=None, primary_key=True)
    id_investigation: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("investigations.id_investigation", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    title: str = Field(
        sa_column=Column(String(255), nullable=False),
    )
    content_html: str = Field(
        default="",
        sa_column=Column(Text, nullable=False, server_default=""),
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
