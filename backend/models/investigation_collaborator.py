from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, UniqueConstraint
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo

import enum


class PermissionLevel(str, enum.Enum):
    """Collaborator permission levels on an investigation."""

    manager = "manager"
    editeur = "editeur"
    lecteur = "lecteur"


class InvestigationCollaborator(SQLModel, table=True):
    """Collaborator membership/invitation on an investigation with permission level."""

    __tablename__ = "investigation_collaborators"
    __table_args__ = (
        UniqueConstraint("id_investigation", "id_user", name="uq_investigation_user"),
    )

    id_collaborator: Optional[int] = Field(default=None, primary_key=True)
    id_investigation: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("investigations.id_investigation", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    id_user: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("users.id_user", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    permission_level: PermissionLevel = Field(
        sa_column=Column(
            Enum(PermissionLevel, name="permission_level_enum", native_enum=True),
            nullable=False,
            default=PermissionLevel.lecteur,
        ),
    )
    invited_by: Optional[int] = Field(
        sa_column=Column(
            Integer,
            ForeignKey("users.id_user", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    invited_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    accepted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
