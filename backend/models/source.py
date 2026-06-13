from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, BigInteger, Column, DateTime, ForeignKey, Integer, String, Text
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class InvestigationSource(SQLModel, table=True):
    """Capture archivee d'une source externe (page, screenshot, media) rattachee
    a une enquete. Le binaire est dans MinIO ; ici on stocke metadonnees + hash."""

    __tablename__ = "investigation_sources"

    id_source: Optional[int] = Field(default=None, primary_key=True)
    id_investigation: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("investigations.id_investigation", ondelete="CASCADE"),
            nullable=False,
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
    title: str = Field(sa_column=Column(String(255), nullable=False))
    source_url: str = Field(sa_column=Column(Text, nullable=False))
    source_type: str = Field(sa_column=Column(String(20), nullable=False))
    mime_type: str = Field(sa_column=Column(String(100), nullable=False))
    size_bytes: int = Field(sa_column=Column(BigInteger, nullable=False))
    content_hash: str = Field(sa_column=Column(String(64), nullable=False, index=True))
    storage_key: str = Field(sa_column=Column(String(512), nullable=False))
    # Lie plusieurs captures d'un meme evenement (screenshot + MHTML d'une page)
    capture_group: Optional[str] = Field(
        default=None,
        sa_column=Column(String(36), nullable=True, index=True),
    )
    page_metadata: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    # Horodatage cote client (instant de la capture)
    captured_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    # Horodatage cote serveur (reception)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
