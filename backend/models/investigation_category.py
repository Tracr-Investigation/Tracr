import uuid
from typing import Optional
from sqlalchemy import Column, ForeignKey, UniqueConstraint, Uuid
from sqlmodel import Field, SQLModel


class InvestigationCategory(SQLModel, table=True):
    """Link row tying an investigation to a category (many-to-many)."""

    __tablename__ = "investigation_categories"
    __table_args__ = (
        UniqueConstraint("id_investigation", "id_category", name="uq_investigation_category"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    id_investigation: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("investigations.id_investigation", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    id_category: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("categories.id_category", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
