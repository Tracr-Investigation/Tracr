from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class TaskResponse(SQLModel, table=True):
    __tablename__ = "task_responses"

    id_response: Optional[int] = Field(default=None, primary_key=True)
    id_task: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("tasks.id_task", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    id_user: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
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
