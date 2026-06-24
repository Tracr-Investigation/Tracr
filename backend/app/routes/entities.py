from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlmodel import Session
from typing import Optional

from services import investigation_service, log_service, user_service
from services import entity_service
from services.collaborator_service import get_collaborator_permission
from utils.security import verify_token
from app.dependencies import get_db

router = APIRouter(prefix="/investigations")


def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Goal: resolve and validate the authenticated user from the JWT. Input: token payload, db. Output: User (401 if not found/inactive)."""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _check_access(db: Session, investigation_id: int, user_id: int):
    """Goal: ensure the investigation exists and the user is owner/collaborator. Input: db, investigation_id, user_id. Output: (investigation, permission) (403/404 on errors)."""
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    is_owner = investigation.owner_id == user_id
    collab_permission = get_collaborator_permission(db, investigation_id, user_id)
    if not is_owner and not collab_permission:
        raise HTTPException(status_code=403, detail="Access denied")
    permission = "owner" if is_owner else collab_permission
    return investigation, permission


def _require_write(permission: str):
    """Goal: enforce write permission (owner/manager/editeur). Input: permission. Output: None (403 if read-only)."""
    if permission not in ("owner", "manager", "editeur"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")


# --- Timeline ---


@router.get("/{investigation_id}/timeline")
async def get_timeline(
    investigation_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    category: str = Query(default=""),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: return an investigation's paginated activity timeline + categories. Input: investigation_id, skip, limit, category, auth, db. Output: {"events", "total", "categories"}."""
    _check_access(db, investigation_id, user.id_user)
    events = log_service.get_timeline_for_investigation(db, investigation_id, skip=skip, limit=limit, category=category)
    total = log_service.count_timeline_for_investigation(db, investigation_id, category=category)
    categories = log_service.get_timeline_categories(db, investigation_id)
    return {"events": events, "total": total, "categories": categories}


# --- Graph ---


@router.get("/{investigation_id}/graph")
async def get_graph(
    investigation_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: return the investigation's entity graph (nodes + edges). Input: investigation_id, auth, db. Output: graph dict."""
    _check_access(db, investigation_id, user.id_user)
    return entity_service.get_graph(db, investigation_id)


# --- Entities ---


class EntityCreateRequest(BaseModel):
    type: str
    label: str
    value: Optional[str] = None
    notes: Optional[str] = None
    color: Optional[str] = None
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None


class EntityUpdateRequest(BaseModel):
    label: Optional[str] = None
    value: Optional[str] = None
    notes: Optional[str] = None
    color: Optional[str] = None
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None
    clear_value: bool = False
    clear_notes: bool = False


@router.get("/{investigation_id}/entities")
async def list_entities(
    investigation_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: list the investigation's entities. Input: investigation_id, auth, db. Output: {"entities"}."""
    _check_access(db, investigation_id, user.id_user)
    return {"entities": entity_service.get_entities(db, investigation_id)}


@router.post("/{investigation_id}/entities")
async def create_entity(
    investigation_id: int,
    body: EntityCreateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: create an entity (type-validated) in the graph. Input: investigation_id, body, auth, db. Output: entity dict (403/422 on errors)."""
    _, permission = _check_access(db, investigation_id, user.id_user)
    _require_write(permission)

    VALID_TYPES = {"person", "organization", "ip", "domain", "phone", "email", "account", "location", "event", "other"}
    if body.type not in VALID_TYPES:
        raise HTTPException(status_code=422, detail=f"Invalid entity type. Must be one of: {', '.join(sorted(VALID_TYPES))}")

    entity = entity_service.create_entity(
        db,
        id_investigation=investigation_id,
        type=body.type,
        label=body.label,
        created_by=user.id_user,
        value=body.value,
        notes=body.notes,
        color=body.color,
        pos_x=body.pos_x,
        pos_y=body.pos_y,
    )
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="entity", action="create",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Entity #{entity.id_entity} ({body.type}) '{body.label}' created",
        ip_address=ip,
    )
    return entity_service._entity_to_dict(entity, user.pseudo)


@router.patch("/{investigation_id}/entities/{entity_id}")
async def update_entity(
    investigation_id: int,
    entity_id: int,
    body: EntityUpdateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: update an entity (label/value/notes/color/position). Input: investigation_id, entity_id, body, auth, db. Output: entity dict (403/404 on errors)."""
    _, permission = _check_access(db, investigation_id, user.id_user)
    _require_write(permission)

    entity = entity_service.get_entity_by_id(db, entity_id)
    if not entity or entity.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Entity not found")

    updated = entity_service.update_entity(
        db, entity,
        label=body.label,
        value=body.value,
        notes=body.notes,
        color=body.color,
        pos_x=body.pos_x,
        pos_y=body.pos_y,
        clear_value=body.clear_value,
        clear_notes=body.clear_notes,
    )
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="entity", action="update",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Entity #{entity_id} updated",
        ip_address=ip,
    )
    return entity_service._entity_to_dict(updated)


@router.post("/{investigation_id}/entities/reset-positions")
async def reset_entity_positions(
    investigation_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: clear all entity positions (re-layout). Input: investigation_id, auth, db. Output: {"detail"} with count."""
    _, permission = _check_access(db, investigation_id, user.id_user)
    _require_write(permission)
    count = entity_service.reset_positions(db, investigation_id)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="entity", action="update",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Positions reset for {count} entities",
        ip_address=ip,
    )
    return {"detail": f"Positions reset for {count} entities"}


@router.delete("/{investigation_id}/entities/{entity_id}")
async def delete_entity(
    investigation_id: int,
    entity_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: delete an entity. Input: investigation_id, entity_id, auth, db. Output: {"detail"} (403/404 on errors)."""
    _, permission = _check_access(db, investigation_id, user.id_user)
    _require_write(permission)

    entity = entity_service.get_entity_by_id(db, entity_id)
    if not entity or entity.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Entity not found")

    label = entity.label
    entity_service.delete_entity(db, entity)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="entity", action="delete",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Entity #{entity_id} '{label}' deleted",
        ip_address=ip,
    )
    return {"detail": "Entity deleted"}


# --- Relations ---


class RelationCreateRequest(BaseModel):
    source_id: int
    target_id: int
    label: Optional[str] = None


class RelationUpdateRequest(BaseModel):
    label: Optional[str] = None


@router.get("/{investigation_id}/relations")
async def list_relations(
    investigation_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: list the investigation's relations. Input: investigation_id, auth, db. Output: {"relations"}."""
    _check_access(db, investigation_id, user.id_user)
    return {"relations": entity_service.get_relations(db, investigation_id)}


@router.post("/{investigation_id}/relations")
async def create_relation(
    investigation_id: int,
    body: RelationCreateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: link two entities with a relation. Input: investigation_id, body (source/target/label), auth, db. Output: relation dict (400/403/404 on errors)."""
    _, permission = _check_access(db, investigation_id, user.id_user)
    _require_write(permission)

    source = entity_service.get_entity_by_id(db, body.source_id)
    if not source or source.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Source entity not found")

    target = entity_service.get_entity_by_id(db, body.target_id)
    if not target or target.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Target entity not found")

    if body.source_id == body.target_id:
        raise HTTPException(status_code=400, detail="Source and target must be different")

    relation = entity_service.create_relation(
        db,
        id_investigation=investigation_id,
        source_id=body.source_id,
        target_id=body.target_id,
        created_by=user.id_user,
        label=body.label,
    )
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="entity", action="link",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Link #{relation.id_relation}: {source.label} → {target.label}",
        ip_address=ip,
    )
    return entity_service._relation_to_dict(relation, user.pseudo)


@router.patch("/{investigation_id}/relations/{relation_id}")
async def update_relation(
    investigation_id: int,
    relation_id: int,
    body: RelationUpdateRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: update a relation's label. Input: investigation_id, relation_id, body, auth, db. Output: relation dict (403/404 on errors)."""
    _, permission = _check_access(db, investigation_id, user.id_user)
    _require_write(permission)

    relation = entity_service.get_relation_by_id(db, relation_id)
    if not relation or relation.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Relation not found")

    updated = entity_service.update_relation(db, relation, label=body.label)
    return entity_service._relation_to_dict(updated)


@router.delete("/{investigation_id}/relations/{relation_id}")
async def delete_relation(
    investigation_id: int,
    relation_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: delete a relation. Input: investigation_id, relation_id, auth, db. Output: {"detail"} (403/404 on errors)."""
    _, permission = _check_access(db, investigation_id, user.id_user)
    _require_write(permission)

    relation = entity_service.get_relation_by_id(db, relation_id)
    if not relation or relation.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Relation not found")

    entity_service.delete_relation(db, relation)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="entity", action="unlink",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Link #{relation_id} deleted",
        ip_address=ip,
    )
    return {"detail": "Relation deleted"}
