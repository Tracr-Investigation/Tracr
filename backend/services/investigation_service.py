from typing import Optional

from sqlalchemy.orm import Session
from models.investigation import Investigation
from models.investigation_status import InvestigationStatus

DEFAULT_STATUS_ID = 4


def get_investigations_by_owner(db: Session, owner_id: int) -> list[dict]:
    rows = (
        db.query(Investigation, InvestigationStatus)
        .join(InvestigationStatus, Investigation.id_status == InvestigationStatus.id_status)
        .filter(Investigation.owner_id == owner_id)
        .order_by(Investigation.created_at.desc())
        .all()
    )
    return [
        {
            "id_investigation": inv.id_investigation,
            "title": inv.title,
            "description": inv.description,
            "status": {
                "id_status": status.id_status,
                "name": status.name,
                "color": status.color,
            },
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
            "closed_at": inv.closed_at.isoformat() if inv.closed_at else None,
        }
        for inv, status in rows
    ]


def create_investigation(
    db: Session, title: str, owner_id: int, description: Optional[str] = None
) -> Investigation:
    investigation = Investigation(
        title=title,
        description=description,
        id_status=DEFAULT_STATUS_ID,
        owner_id=owner_id,
    )
    db.add(investigation)
    db.commit()
    db.refresh(investigation)
    return investigation


def count_investigations_by_owner(db: Session, owner_id: int) -> int:
    return db.query(Investigation).filter(Investigation.owner_id == owner_id).count()
