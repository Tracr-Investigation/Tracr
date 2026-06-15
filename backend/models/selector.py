from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class InvestigationSelector(SQLModel, table=True):
    """Selecteur OSINT rattache a une enquete : un identifiant recherche
    (email, telephone, pseudo, domaine...) que l'on confronte au texte des
    sources archivees pour detecter des "hits". `normalized_value` est la forme
    canonique utilisee pour le matching (insensible a la casse, sans separateurs)."""

    __tablename__ = "investigation_selectors"
    __table_args__ = (
        UniqueConstraint(
            "id_investigation",
            "selector_type",
            "normalized_value",
            name="uq_selector_per_investigation",
        ),
    )

    id_selector: Optional[int] = Field(default=None, primary_key=True)
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
    selector_type: str = Field(sa_column=Column(String(30), nullable=False))
    # Valeur saisie telle quelle (affichage)
    value: str = Field(sa_column=Column(String(500), nullable=False))
    # Forme canonique pour le matching (lower, sans separateurs selon le type)
    normalized_value: str = Field(
        sa_column=Column(String(500), nullable=False, index=True),
    )
    # Libelle optionnel ("compte Twitter principal", "domicile"...)
    label: Optional[str] = Field(
        default=None,
        sa_column=Column(String(255), nullable=True),
    )
    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
