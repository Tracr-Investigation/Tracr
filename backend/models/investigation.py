from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class Investigation(SQLModel, table=True):
    __tablename__ = "investigations"

    id_investigation: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=255, nullable=False)
    description: Optional[str] = Field(default=None)
    # Objectifs de l'enquete (texte libre). Repris en tete des exports PDF, juste
    # apres le sommaire.
    objectives: Optional[str] = Field(default=None)
    id_status: int = Field(
        sa_column=Column(Integer, ForeignKey("investigation_statuses.id_status", ondelete="RESTRICT"), nullable=False, index=True),
    )
    owner_id: int = Field(
        sa_column=Column(Integer, ForeignKey("users.id_user", ondelete="CASCADE"), nullable=False, index=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    closed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    # Cle de l'objet MinIO de l'image de couverture (page de garde des exports PDF).
    # NULL => une couverture par defaut est utilisee a l'export.
    cover_storage_key: Optional[str] = Field(
        default=None,
        sa_column=Column(String(512), nullable=True),
    )
