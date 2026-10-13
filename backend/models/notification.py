import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, ForeignKey, Text, Uuid
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class Notification(SQLModel, table=True):
    """In-app notification delivered to a user (type, message, read flag)."""

    __tablename__ = "notifications"

    id_notification: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    id_user: uuid.UUID = Field(
        sa_column=Column(Uuid, ForeignKey("users.id_user", ondelete="CASCADE"), nullable=False, index=True),
    )
    type: str = Field(max_length=50, nullable=False, index=True)
    title: str = Field(max_length=255, nullable=False)
    message: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    reference_id: Optional[uuid.UUID] = Field(default=None)
    reference_type: Optional[str] = Field(default=None, max_length=50)
    is_read: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False, index=True),
    )
