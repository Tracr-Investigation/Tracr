import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, ForeignKey, Text, Uuid
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class TaskResponse(SQLModel, table=True):
    """Reply/comment posted on a task."""

    __tablename__ = "task_responses"

    id_response: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    id_task: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("tasks.id_task", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    id_user: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(
            Uuid,
            ForeignKey("users.id_user", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
    content: str = Field(
        sa_column=Column(Text, nullable=False),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
