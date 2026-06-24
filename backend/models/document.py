from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, false
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class DocumentBackup(SQLModel, table=True):
    """Saved version of a document (manual or scheduled auto-backup; pinnable)."""

    __tablename__ = "document_backups"

    id_backup: Optional[int] = Field(default=None, primary_key=True)
    id_document: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("documents.id_document", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    id_user: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("users.id_user", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    title: str = Field(sa_column=Column(String(255), nullable=False))
    content_html: str = Field(
        default="",
        sa_column=Column(Text, nullable=False, server_default=""),
    )
    # 'manual' = créé par un utilisateur ; 'auto' = sauvegarde planifiée (toutes les 10 min)
    kind: str = Field(
        default="manual",
        sa_column=Column(String(16), nullable=False, server_default="manual", index=True),
    )
    # backup épinglé : protégé, jamais supprimé par la rétention
    pinned: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default=false()),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class Document(SQLModel, table=True):
    """Rich-text report document attached to an investigation."""

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
