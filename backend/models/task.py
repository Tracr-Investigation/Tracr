from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo

import enum


class TaskStatus(str, enum.Enum):
    todo = "todo"
    en_cours = "en_cours"
    bloque = "bloque"
    en_revue = "en_revue"
    a_valider = "a_valider"
    termine = "termine"


class TaskPriority(str, enum.Enum):
    basse = "basse"
    normale = "normale"
    haute = "haute"
    urgente = "urgente"


class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id_task: Optional[int] = Field(default=None, primary_key=True)
    # NULL = tâche personnelle (rattachée à son créateur, hors enquête)
    id_investigation: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("investigations.id_investigation", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
    )
    title: str = Field(
        sa_column=Column(String(255), nullable=False),
    )
    description: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    status: TaskStatus = Field(
        sa_column=Column(
            Enum(TaskStatus, name="task_status_enum", native_enum=True),
            nullable=False,
            default=TaskStatus.todo,
        ),
    )
    priority: TaskPriority = Field(
        sa_column=Column(
            Enum(TaskPriority, name="task_priority_enum", native_enum=True),
            nullable=False,
            default=TaskPriority.normale,
        ),
    )
    is_private: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, default=False),
    )
    # Ordre vertical de la tâche au sein de sa colonne (statut) sur le Kanban
    position: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, default=0, server_default="0"),
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
    assigned_to: Optional[int] = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("users.id_user", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )
    due_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
