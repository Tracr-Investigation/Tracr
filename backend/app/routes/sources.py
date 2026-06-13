"""sources.py -- routes d'archivage de sources (preuves OSINT).

Endpoints :
  GET    /investigations/{id}/sources         liste des sources d'une enquete
  POST   /investigations/{id}/sources         depot d'une capture (multipart)
  GET    /sources/{id}                         metadonnees d'une source
  GET    /sources/{id}/download                telechargement du binaire
  DELETE /sources/{id}                         suppression
"""
import json
from datetime import datetime
from urllib.parse import quote
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response
from sqlmodel import Session

from app.dependencies import get_db
from config import settings
from services import (
    investigation_service,
    log_service,
    source_service,
    task_service,
    user_service,
)
from utils.security import verify_token

router = APIRouter(prefix="/investigations")
sources_router = APIRouter(prefix="/sources")


def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _check_investigation_access(db: Session, investigation_id: int, user_id: int):
    """Retourne (investigation, permission). 404 si absente, 403 si non membre."""
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    permission = task_service.get_user_permission(db, investigation_id, user_id)
    if permission is None:
        raise HTTPException(status_code=403, detail="Access denied")
    return investigation, permission


def _load_source_with_access(db: Session, source_id: int, user_id: int):
    """Charge la source + verifie l'acces via son enquete."""
    source = source_service.get_source(db, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    _, permission = _check_investigation_access(db, source.id_investigation, user_id)
    return source, permission


@router.get("/{investigation_id}/sources")
async def list_sources(
    investigation_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_investigation_access(db, investigation_id, user.id_user)
    sources = source_service.list_sources(db, investigation_id)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="list_sources",
        id_user=user.id_user, detail=f"Investigation #{investigation_id}",
        ip_address=ip,
    )
    return {"sources": sources}


@router.post("/{investigation_id}/sources")
async def create_source(
    investigation_id: int,
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    source_url: str = Form(...),
    source_type: str = Form(...),
    captured_at: str | None = Form(None),
    capture_group: str | None = Form(None),
    page_metadata: str | None = Form(None),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, permission = _check_investigation_access(db, investigation_id, user.id_user)
    if not source_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions to add sources")

    if not source_service.is_valid_type(source_type):
        raise HTTPException(status_code=422, detail="Invalid source_type")

    if not title.strip():
        raise HTTPException(status_code=422, detail="Title is required")

    # Horodatage cote client : ISO 8601, defaut = maintenant
    if captured_at:
        try:
            captured_dt = datetime.fromisoformat(captured_at)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid captured_at (expected ISO 8601)")
    else:
        captured_dt = datetime.now(ZoneInfo("Europe/Paris"))

    metadata_dict = None
    if page_metadata:
        try:
            metadata_dict = json.loads(page_metadata)
        except json.JSONDecodeError:
            raise HTTPException(status_code=422, detail="Invalid page_metadata (expected JSON)")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Empty file")

    max_bytes = settings.MAX_SOURCE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_SOURCE_SIZE_MB} MB")

    source = source_service.create_source(
        db,
        id_investigation=investigation_id,
        created_by=user.id_user,
        title=title.strip(),
        source_url=source_url,
        source_type=source_type,
        mime_type=file.content_type or "application/octet-stream",
        content=content,
        captured_at=captured_dt,
        capture_group=capture_group,
        page_metadata=metadata_dict,
    )

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="source", action="create",
        id_user=user.id_user, id_investigation=investigation_id,
        detail=f"Source #{source.id_source} - {source.title} ({source.source_type})",
        ip_address=ip,
    )
    return source_service.source_detail(db, source)


@sources_router.get("/{source_id}")
async def get_source(
    source_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source, _ = _load_source_with_access(db, source_id, user.id_user)
    return source_service.source_detail(db, source)


@sources_router.get("/{source_id}/download")
async def download_source(
    source_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source, _ = _load_source_with_access(db, source_id, user.id_user)
    try:
        data = source_service.get_content(source)
    except Exception:
        raise HTTPException(status_code=502, detail="Storage unavailable")

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="download_source",
        id_user=user.id_user, detail=f"Source #{source_id}",
        ip_address=ip,
    )

    filename = quote(source.title)
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
    return Response(content=data, media_type=source.mime_type, headers=headers)


@sources_router.get("/{source_id}/view")
async def view_source(
    source_id: int,
    sig: str,
    db: Session = Depends(get_db),
):
    """Sert le contenu via une signature HMAC stable (pas d'auth utilisateur).
    Permet d'embarquer une image/capture dans un document en `<img src=http...>`.
    """
    source = source_service.get_source(db, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    if not source_service.verify_view_signature(source, sig):
        raise HTTPException(status_code=403, detail="Invalid signature")
    try:
        data = source_service.get_content(source)
    except Exception:
        raise HTTPException(status_code=502, detail="Storage unavailable")
    return Response(
        content=data,
        media_type=source.mime_type,
        headers={"Cache-Control": "private, max-age=86400"},
    )


@sources_router.delete("/{source_id}")
async def delete_source(
    source_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source, permission = _load_source_with_access(db, source_id, user.id_user)
    if not source_service.can_delete(permission, source, user.id_user):
        raise HTTPException(status_code=403, detail="Insufficient permissions to delete this source")

    title = source.title
    id_investigation = source.id_investigation
    source_service.delete_source(db, source)

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="source", action="delete",
        id_user=user.id_user, id_investigation=id_investigation,
        detail=f"Source #{source_id} - {title} deleted",
        ip_address=ip,
    )
    return {"detail": "Source deleted"}
