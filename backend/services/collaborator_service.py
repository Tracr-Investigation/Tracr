from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from models.investigation import Investigation
from models.investigation_collaborator import InvestigationCollaborator
from models.user import User


def invite_collaborator(
    db: Session,
    id_investigation: int,
    id_user: int,
    permission_level: str,
    invited_by: int,
) -> dict:
    collab = InvestigationCollaborator(
        id_investigation=id_investigation,
        id_user=id_user,
        permission_level=permission_level,
        invited_by=invited_by,
    )
    db.add(collab)
    db.commit()
    db.refresh(collab)
    return {
        "id_collaborator": collab.id_collaborator,
        "id_investigation": collab.id_investigation,
        "id_user": collab.id_user,
        "permission_level": collab.permission_level.value if hasattr(collab.permission_level, "value") else collab.permission_level,
        "invited_by": collab.invited_by,
        "invited_at": collab.invited_at.isoformat() if collab.invited_at else None,
        "accepted_at": None,
    }


def accept_invitation(db: Session, id_collaborator: int, id_user: int) -> Optional[dict]:
    collab = (
        db.query(InvestigationCollaborator)
        .filter(
            InvestigationCollaborator.id_collaborator == id_collaborator,
            InvestigationCollaborator.id_user == id_user,
            InvestigationCollaborator.accepted_at.is_(None),
        )
        .first()
    )
    if not collab:
        return None
    collab.accepted_at = datetime.now(ZoneInfo("Europe/Paris"))
    db.add(collab)
    db.commit()
    db.refresh(collab)
    return {
        "id_collaborator": collab.id_collaborator,
        "id_investigation": collab.id_investigation,
        "id_user": collab.id_user,
        "permission_level": collab.permission_level.value if hasattr(collab.permission_level, "value") else collab.permission_level,
        "accepted_at": collab.accepted_at.isoformat() if collab.accepted_at else None,
    }


def reject_invitation(db: Session, id_collaborator: int, id_user: int) -> bool:
    collab = (
        db.query(InvestigationCollaborator)
        .filter(
            InvestigationCollaborator.id_collaborator == id_collaborator,
            InvestigationCollaborator.id_user == id_user,
            InvestigationCollaborator.accepted_at.is_(None),
        )
        .first()
    )
    if not collab:
        return False
    db.delete(collab)
    db.commit()
    return True


def remove_collaborator(db: Session, id_collaborator: int, id_investigation: int) -> bool:
    collab = (
        db.query(InvestigationCollaborator)
        .filter(
            InvestigationCollaborator.id_collaborator == id_collaborator,
            InvestigationCollaborator.id_investigation == id_investigation,
        )
        .first()
    )
    if not collab:
        return False
    db.delete(collab)
    db.commit()
    return True


def update_permission(
    db: Session, id_collaborator: int, id_investigation: int, new_permission: str
) -> Optional[dict]:
    collab = (
        db.query(InvestigationCollaborator)
        .filter(
            InvestigationCollaborator.id_collaborator == id_collaborator,
            InvestigationCollaborator.id_investigation == id_investigation,
        )
        .first()
    )
    if not collab:
        return None
    collab.permission_level = new_permission
    db.add(collab)
    db.commit()
    db.refresh(collab)
    return {
        "id_collaborator": collab.id_collaborator,
        "id_user": collab.id_user,
        "permission_level": collab.permission_level.value if hasattr(collab.permission_level, "value") else collab.permission_level,
    }


def get_collaborators_for_investigation(db: Session, id_investigation: int) -> list[dict]:
    rows = (
        db.query(InvestigationCollaborator, User)
        .join(User, InvestigationCollaborator.id_user == User.id_user)
        .filter(InvestigationCollaborator.id_investigation == id_investigation)
        .order_by(InvestigationCollaborator.invited_at.asc())
        .all()
    )
    return [
        {
            "id_collaborator": collab.id_collaborator,
            "id_user": collab.id_user,
            "pseudo": user.pseudo,
            "permission_level": collab.permission_level.value if hasattr(collab.permission_level, "value") else collab.permission_level,
            "invited_at": collab.invited_at.isoformat() if collab.invited_at else None,
            "accepted_at": collab.accepted_at.isoformat() if collab.accepted_at else None,
        }
        for collab, user in rows
    ]


def get_pending_invitations_for_user(db: Session, id_user: int) -> list[dict]:
    rows = (
        db.query(InvestigationCollaborator, Investigation, User)
        .join(Investigation, InvestigationCollaborator.id_investigation == Investigation.id_investigation)
        .outerjoin(User, InvestigationCollaborator.invited_by == User.id_user)
        .filter(
            InvestigationCollaborator.id_user == id_user,
            InvestigationCollaborator.accepted_at.is_(None),
        )
        .order_by(InvestigationCollaborator.invited_at.desc())
        .all()
    )
    return [
        {
            "id_collaborator": collab.id_collaborator,
            "id_investigation": collab.id_investigation,
            "investigation_title": inv.title,
            "permission_level": collab.permission_level.value if hasattr(collab.permission_level, "value") else collab.permission_level,
            "invited_by_pseudo": inviter.pseudo if inviter else None,
            "invited_at": collab.invited_at.isoformat() if collab.invited_at else None,
        }
        for collab, inv, inviter in rows
    ]


def get_collaborator_permission(db: Session, id_investigation: int, id_user: int) -> Optional[str]:
    collab = (
        db.query(InvestigationCollaborator)
        .filter(
            InvestigationCollaborator.id_investigation == id_investigation,
            InvestigationCollaborator.id_user == id_user,
            InvestigationCollaborator.accepted_at.isnot(None),
        )
        .first()
    )
    if not collab:
        return None
    return collab.permission_level.value if hasattr(collab.permission_level, "value") else collab.permission_level


def get_collaborator_by_id(db: Session, id_collaborator: int) -> Optional[InvestigationCollaborator]:
    return (
        db.query(InvestigationCollaborator)
        .filter(InvestigationCollaborator.id_collaborator == id_collaborator)
        .first()
    )
