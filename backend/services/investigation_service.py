from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session
from models.investigation import Investigation
from models.investigation_status import InvestigationStatus
from models.investigation_collaborator import InvestigationCollaborator
from models.user import User
from models.category import Category
from models.investigation_category import InvestigationCategory

DEFAULT_STATUS_ID = 4


def get_investigations_for_user(db: Session, user_id: int) -> list[dict]:
    rows = (
        db.query(Investigation, InvestigationStatus)
        .join(InvestigationStatus, Investigation.id_status == InvestigationStatus.id_status)
        .outerjoin(
            InvestigationCollaborator,
            (InvestigationCollaborator.id_investigation == Investigation.id_investigation)
            & (InvestigationCollaborator.id_user == user_id)
            & (InvestigationCollaborator.accepted_at.isnot(None)),
        )
        .filter(
            or_(
                Investigation.owner_id == user_id,
                InvestigationCollaborator.id_collaborator.isnot(None),
            )
        )
        .order_by(Investigation.updated_at.desc())
        .all()
    )
    seen = set()
    results = []
    for inv, status in rows:
        if inv.id_investigation in seen:
            continue
        seen.add(inv.id_investigation)
        categories = (
            db.query(Category)
            .join(InvestigationCategory, InvestigationCategory.id_category == Category.id_category)
            .filter(InvestigationCategory.id_investigation == inv.id_investigation)
            .all()
        )
        results.append(
            {
                "id_investigation": inv.id_investigation,
                "title": inv.title,
                "description": inv.description,
                "is_owner": inv.owner_id == user_id,
                "status": {
                    "id_status": status.id_status,
                    "name": status.name,
                    "color": status.color,
                },
                "categories": [
                    {"id_category": c.id_category, "name": c.name, "color": c.color, "icon": c.icon}
                    for c in categories
                ],
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
                "closed_at": inv.closed_at.isoformat() if inv.closed_at else None,
            }
        )
    return results


def count_investigations_for_user(db: Session, user_id: int) -> int:
    return (
        db.query(Investigation.id_investigation)
        .outerjoin(
            InvestigationCollaborator,
            (InvestigationCollaborator.id_investigation == Investigation.id_investigation)
            & (InvestigationCollaborator.id_user == user_id)
            & (InvestigationCollaborator.accepted_at.isnot(None)),
        )
        .filter(
            or_(
                Investigation.owner_id == user_id,
                InvestigationCollaborator.id_collaborator.isnot(None),
            )
        )
        .distinct()
        .count()
    )


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


def update_investigation_status(
    db: Session, investigation: Investigation, new_status_id: int
) -> Investigation:
    from datetime import datetime
    from zoneinfo import ZoneInfo

    investigation.id_status = new_status_id
    investigation.updated_at = datetime.now(ZoneInfo("Europe/Paris"))
    db.add(investigation)
    db.commit()
    db.refresh(investigation)
    return investigation


def get_investigation_by_id(db: Session, investigation_id: int) -> Optional[Investigation]:
    return (
        db.query(Investigation)
        .filter(Investigation.id_investigation == investigation_id)
        .first()
    )


def get_investigation_detail(db: Session, investigation_id: int, current_user_id: Optional[int] = None) -> Optional[dict]:
    row = (
        db.query(Investigation, InvestigationStatus, User)
        .join(InvestigationStatus, Investigation.id_status == InvestigationStatus.id_status)
        .join(User, Investigation.owner_id == User.id_user)
        .filter(Investigation.id_investigation == investigation_id)
        .first()
    )
    if not row:
        return None
    inv, status, owner = row

    # Collaborateurs
    from services import collaborator_service
    collaborators = collaborator_service.get_collaborators_for_investigation(db, investigation_id)

    # Permission de l'utilisateur courant
    user_permission = None
    if current_user_id:
        if inv.owner_id == current_user_id:
            user_permission = "owner"
        else:
            user_permission = collaborator_service.get_collaborator_permission(
                db, investigation_id, current_user_id
            )

    categories = (
        db.query(Category)
        .join(InvestigationCategory, InvestigationCategory.id_category == Category.id_category)
        .filter(InvestigationCategory.id_investigation == investigation_id)
        .all()
    )

    return {
        "id_investigation": inv.id_investigation,
        "title": inv.title,
        "description": inv.description,
        "status": {
            "id_status": status.id_status,
            "name": status.name,
            "color": status.color,
        },
        "categories": [
            {"id_category": c.id_category, "name": c.name, "color": c.color, "icon": c.icon}
            for c in categories
        ],
        "owner": {
            "id_user": owner.id_user,
            "pseudo": owner.pseudo,
        },
        "collaborators": collaborators,
        "user_permission": user_permission,
        "created_at": inv.created_at.isoformat() if inv.created_at else None,
        "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
        "closed_at": inv.closed_at.isoformat() if inv.closed_at else None,
    }
