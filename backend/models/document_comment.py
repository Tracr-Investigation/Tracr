from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class DocumentComment(SQLModel, table=True):
    """TipTap inline comment anchored on a span of a document."""

    __tablename__ = "document_comments"

    id_comment: Optional[int] = Field(default=None, primary_key=True)
    id_document: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("documents.id_document", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    # Identifiant utilise par TipTap
    comment_id: str = Field(sa_column=Column(String(64), nullable=False, index=True))
    quote: str = Field(
        default="",
        sa_column=Column(Text, nullable=False, server_default=""))

    content: str = Field(sa_column=Column(Text, nullable=False))

    author_id: Optional[int] = Field(default=None, sa_column=Column( Integer, ForeignKey("users.id_user", ondelete="SET NULL"), nullable=True, index=True))

    resolved: bool = Field(default=False,sa_column=Column(Boolean, nullable=False, default=False))

    created_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")), sa_column=Column(DateTime(timezone=True), nullable=False))
