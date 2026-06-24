from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class InvestigationSource(SQLModel, table=True):
    """Archived capture of an external source (page, screenshot, media) for an investigation; binary lives in MinIO, metadata + hash stored here."""

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
    # Role d'une source rattachee a une autre. "page_media" = image/video/audio
    # embarque(e) dans une archive HTML : masque(e) de la liste principale par
    # defaut (lie au parent via capture_group), sauf si show_in_list.
    role: Optional[str] = Field(
        default=None,
        sa_column=Column(String(20), nullable=True, index=True),
    )
    # Un media de page (role=page_media) que l'enqueteur a choisi de faire
    # apparaitre quand meme dans la liste principale, tout en restant rattache.
    show_in_list: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false"),
    )
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
    # Notes libres de l'enqueteur sur la source (contexte, observations)
    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    # Texte extrait de la capture (HTML/MHTML/txt), confronte aux selecteurs.
    extracted_text: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    # extracted = texte dispo ; pending_ocr = image sans texte (OCR a venir) ;
    # none = non analysable (video...) ou couvert par une autre capture du groupe.
    text_status: str = Field(
        default="none",
        sa_column=Column(String(20), nullable=False, server_default="none"),
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
