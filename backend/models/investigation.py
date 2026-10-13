import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Uuid
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class Investigation(SQLModel, table=True):
    """Investigation case: title, objectives, status, owner and PDF cover."""

    __tablename__ = "investigations"

    id_investigation: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=255, nullable=False)
    description: Optional[str] = Field(default=None)
    # Objectifs de l'enquete (texte libre). Repris en tete des exports PDF, juste
    # apres le sommaire.
    objectives: Optional[str] = Field(default=None)
    # Periode couverte par l'analyse, affichee en en-tete de chaque page des exports PDF.
    analysis_start_date: Optional[date] = Field(default=None, sa_column=Column(Date, nullable=True))
    analysis_end_date: Optional[date] = Field(default=None, sa_column=Column(Date, nullable=True))
    id_status: uuid.UUID = Field(
        sa_column=Column(Uuid, ForeignKey("investigation_statuses.id_status", ondelete="RESTRICT"), nullable=False, index=True),
    )
    owner_id: uuid.UUID = Field(
        sa_column=Column(Uuid, ForeignKey("users.id_user", ondelete="CASCADE"), nullable=False, index=True),
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
