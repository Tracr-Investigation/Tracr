from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, ForeignKey, Integer
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class UserRole(SQLModel, table=True):
    """Link row assigning a role to a user (many-to-many)."""

    __tablename__ = "user_roles"

    id_user_role: Optional[int] = Field(default=None, primary_key=True)
    id_user: int = Field(
        sa_column=Column(Integer, ForeignKey("users.id_user", ondelete="CASCADE"), nullable=False, index=True)
    )
    id_role: int = Field(
        sa_column=Column(Integer, ForeignKey("roles.id_role", ondelete="CASCADE"), nullable=False, index=True)
    )
    assigned_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    assigned_by: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("users.id_user", ondelete="SET NULL"), nullable=True),
    )
