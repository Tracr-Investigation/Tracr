from typing import Optional
from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlmodel import Field, SQLModel


class InvestigationCategory(SQLModel, table=True):
    __tablename__ = "investigation_categories"
    __table_args__ = (
        UniqueConstraint("id_investigation", "id_category", name="uq_investigation_category"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    id_investigation: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("investigations.id_investigation", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
    id_category: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("categories.id_category", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
    )
