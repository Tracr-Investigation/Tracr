from typing import Optional

from sqlalchemy.orm import Session
from models.investigation_status import InvestigationStatus


def get_all_statuses(db: Session) -> list[dict]:
    statuses = (
        db.query(InvestigationStatus)
        .order_by(InvestigationStatus.created_at.desc())
        .all()
    )
    return [
        {
            "id_status": s.id_status,
            "name": s.name,
            "color": s.color,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in statuses
    ]


def get_status_by_id(db: Session, status_id: int) -> Optional[InvestigationStatus]:
    return (
        db.query(InvestigationStatus)
        .filter(InvestigationStatus.id_status == status_id)
        .first()
    )


def create_status(db: Session, name: str, color: Optional[str] = None) -> InvestigationStatus:
    status = InvestigationStatus(name=name, color=color)
    db.add(status)
    db.commit()
    db.refresh(status)
    return status


def update_status(
    db: Session, status: InvestigationStatus, name: Optional[str] = None, color: Optional[str] = None
) -> InvestigationStatus:
    if name is not None:
        status.name = name
    if color is not None:
        status.color = color
    db.add(status)
    db.commit()
    db.refresh(status)
    return status


def delete_status(db: Session, status: InvestigationStatus) -> None:
    db.delete(status)
    db.commit()


def count_statuses(db: Session) -> int:
    return db.query(InvestigationStatus).count()
