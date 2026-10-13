import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, ForeignKey, Uuid
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class UserRole(SQLModel, table=True):
    """Link row assigning a role to a user (many-to-many)."""

    __tablename__ = "user_roles"

    id_user_role: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    id_user: uuid.UUID = Field(
        sa_column=Column(Uuid, ForeignKey("users.id_user", ondelete="CASCADE"), nullable=False, index=True)
    )
    id_role: uuid.UUID = Field(
        sa_column=Column(Uuid, ForeignKey("roles.id_role", ondelete="CASCADE"), nullable=False, index=True)
    )
    assigned_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    assigned_by: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(Uuid, ForeignKey("users.id_user", ondelete="SET NULL"), nullable=True),
    )
