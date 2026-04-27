from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, String
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class User(SQLModel, table=True):
    __tablename__ = "users"

    id_user: Optional[int] = Field(default=None, primary_key=True)
    pseudo: str = Field(index=True, nullable=False, sa_column_kwargs={"unique": True})
    password_hash: str = Field(max_length=256, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    last_login_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    language: str = Field(
        default="en",
        sa_column=Column(String(5), nullable=False, server_default="en"),
    )