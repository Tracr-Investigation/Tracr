"""access.py -- single membership check for investigation-scoped resources.

A user who is neither the owner nor an accepted collaborator receives exactly the
same 404 as for a non-existent investigation: the API never reveals whether an
investigation exists to someone who has no access to it (no existence oracle).
"""
from uuid import UUID

from fastapi import HTTPException
from sqlmodel import Session

from models.investigation import Investigation
from services import investigation_service, task_service

NOT_FOUND_DETAIL = "Investigation not found"


def require_member(
    db: Session, investigation_id: UUID, user_id: UUID, not_found_detail: str = NOT_FOUND_DETAIL,
) -> tuple[Investigation, str]:
    """Return (investigation, permission) for a member; 404 if it does not exist OR the user is not a member.

    not_found_detail lets a child resource (document, source...) answer with its own
    "not found" message, identical whether it is missing or merely inaccessible."""
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    permission = task_service.get_user_permission(db, investigation_id, user_id) if investigation else None
    if investigation is None or permission is None:
        raise HTTPException(status_code=404, detail=not_found_detail)
    return investigation, permission
