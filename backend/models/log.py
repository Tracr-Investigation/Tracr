from datetime import datetime
from typing import Optional
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlmodel import Field, SQLModel
from zoneinfo import ZoneInfo


class Log(SQLModel, table=True):
    __tablename__ = "logs"

    id_log: Optional[int] = Field(default=None, primary_key=True)
    id_user: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("users.id_user", ondelete="SET NULL"), nullable=True, index=True),
    )
    category: str = Field(max_length=50, nullable=False, index=True)
    action: str = Field(max_length=100, nullable=False, index=True)
    detail: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    ip_address: Optional[str] = Field(default=None, max_length=45)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(ZoneInfo("Europe/Paris")),
        sa_column=Column(DateTime(timezone=True), nullable=False, index=True),
    )
