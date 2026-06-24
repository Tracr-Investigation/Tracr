"""selectors.py -- routes de gestion des selecteurs OSINT d'une enquete.

Endpoints :
  GET    /investigations/{id}/selectors          liste des selecteurs
  POST   /investigations/{id}/selectors          creation
  GET    /selectors/types                          types supportes (referentiel)
  PATCH  /selectors/{id}                           modification
  DELETE /selectors/{id}                           suppression
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session

from app.dependencies import get_db
from services import (
    hit_service,
    investigation_service,
    log_service,
    selector_service,
    task_service,
    user_service,
)
from utils.security import verify_token

router = APIRouter(prefix="/investigations")
selectors_router = APIRouter(prefix="/selectors")


class SelectorCreate(BaseModel):
    selector_type: str
    value: str
    label: str | None = None
    notes: str | None = None


class SelectorUpdate(BaseModel):
    selector_type: str | None = None
    value: str | None = None
    label: str | None = None
    notes: str | None = None


def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Goal: resolve and validate the authenticated user from the JWT. Input: token payload, db. Output: User (401 if not found/inactive)."""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _check_investigation_access(db: Session, investigation_id: int, user_id: int):
    """Goal: ensure the investigation exists and the user can access it. Input: db, investigation_id, user_id. Output: (investigation, permission) (403/404 on errors)."""
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    permission = task_service.get_user_permission(db, investigation_id, user_id)
    if permission is None:
        raise HTTPException(status_code=403, detail="Access denied")
    return investigation, permission


def _load_selector_with_access(db: Session, selector_id: int, user_id: int):
    """Goal: load a selector and check the user's access to its investigation. Input: db, selector_id, user_id. Output: (selector, permission) (404 if not found)."""
    selector = selector_service.get_selector(db, selector_id)
    if not selector:
        raise HTTPException(status_code=404, detail="Selector not found")
    _, permission = _check_investigation_access(db, selector.id_investigation, user_id)
    return selector, permission


@selectors_router.get("/types")
async def list_selector_types(user=Depends(get_current_user)):
    """Goal: reference list of selector types (to populate the front lists). Input: auth. Output: {"types": [...]}."""
    return {
        "types": [
            {"value": key, "label": label}
            for key, label in selector_service.SELECTOR_TYPES.items()
        ]
    }


@router.get("/{investigation_id}/selectors")
async def list_selectors(
    investigation_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: list an investigation's selectors. Input: investigation_id, auth, db. Output: {"selectors"}."""
    _check_investigation_access(db, investigation_id, user.id_user)
    selectors = selector_service.list_selectors(db, investigation_id)
    return {"selectors": selectors}


@router.get("/{investigation_id}/hits")
async def list_hits(
    investigation_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: return the already-stored matches (last scan), read-only, no recompute. Input: investigation_id, auth, db. Output: stored hits."""
    _check_investigation_access(db, investigation_id, user.id_user)
    return hit_service.get_stored_hits(db, investigation_id)


@router.post("/{investigation_id}/hits/scan")
async def scan_hits(
    investigation_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: (re)run the analysis — match selectors against source text, store and return hits. Input: investigation_id, auth, db. Output: scan result."""
    _check_investigation_access(db, investigation_id, user.id_user)
    result = hit_service.compute_hits(db, investigation_id)

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="source", action="scan_hits",
        id_user=user.id_user, id_investigation=investigation_id,
        detail=(
            f"{result['selector_count']} selecteurs vs {result['analyzed_sources']} sources"
        ),
        ip_address=ip,
    )
    return result


@router.post("/{investigation_id}/selectors")
async def create_selector(
    investigation_id: int,
    body: SelectorCreate,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: add a selector to an investigation (validated, deduped). Input: investigation_id, body, auth, db. Output: selector detail (403/409/422 on errors)."""
    _, permission = _check_investigation_access(db, investigation_id, user.id_user)
    if not selector_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions to add selectors")

    if not selector_service.is_valid_type(body.selector_type):
        raise HTTPException(status_code=422, detail="Invalid selector_type")
    if not body.value or not body.value.strip():
        raise HTTPException(status_code=422, detail="Value is required")

    normalized = selector_service.normalize(body.selector_type, body.value)
    if not normalized:
        raise HTTPException(status_code=422, detail="Value is empty after normalization")
    if selector_service.find_duplicate(db, investigation_id, body.selector_type, normalized):
        raise HTTPException(status_code=409, detail="Selector already exists in this investigation")

    selector = selector_service.create_selector(
        db,
        id_investigation=investigation_id,
        created_by=user.id_user,
        selector_type=body.selector_type,
        value=body.value,
        label=body.label,
        notes=body.notes,
    )

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="selector", action="create",
        id_user=user.id_user, id_investigation=investigation_id,
        detail=f"Selector #{selector.id_selector} - {selector.selector_type}: {selector.value}",
        ip_address=ip,
    )
    return selector_service.selector_detail(db, selector)


@selectors_router.patch("/{selector_id}")
async def update_selector(
    selector_id: int,
    body: SelectorUpdate,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: update a selector. Input: selector_id, body, auth, db. Output: selector detail (403/422 on errors)."""
    selector, permission = _load_selector_with_access(db, selector_id, user.id_user)
    if not selector_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions to edit selectors")

    if body.selector_type is not None and not selector_service.is_valid_type(body.selector_type):
        raise HTTPException(status_code=422, detail="Invalid selector_type")
    if body.value is not None and not body.value.strip():
        raise HTTPException(status_code=422, detail="Value cannot be empty")

    selector = selector_service.update_selector(
        db, selector,
        value=body.value,
        selector_type=body.selector_type,
        label=body.label,
        notes=body.notes,
    )

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="selector", action="update",
        id_user=user.id_user, id_investigation=selector.id_investigation,
        detail=f"Selector #{selector_id} updated",
        ip_address=ip,
    )
    return selector_service.selector_detail(db, selector)


@selectors_router.delete("/{selector_id}")
async def delete_selector(
    selector_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: delete a selector. Input: selector_id, auth, db. Output: {"detail"} (403 on insufficient perms)."""
    selector, permission = _load_selector_with_access(db, selector_id, user.id_user)
    if not selector_service.can_delete(permission, selector, user.id_user):
        raise HTTPException(status_code=403, detail="Insufficient permissions to delete this selector")

    id_investigation = selector.id_investigation
    value = selector.value
    selector_service.delete_selector(db, selector)

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="selector", action="delete",
        id_user=user.id_user, id_investigation=id_investigation,
        detail=f"Selector #{selector_id} - {value} deleted",
        ip_address=ip,
    )
    return {"detail": "Selector deleted"}
