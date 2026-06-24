from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlmodel import Session

from services import (
    investigation_service,
    log_service,
    user_service,
    document_service,
    template_service,
    task_service,
    export_service,
)
from utils.security import verify_token
from utils.schemas import (
    DocumentCreateRequest,
    DocumentUpdateRequest,
    DocumentCommentCreateRequest,
)
from app.dependencies import get_db


router = APIRouter(prefix="/investigations")
docs_router = APIRouter(prefix="/documents")


def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Goal: resolve and validate the authenticated user from the JWT. Input: token payload, db. Output: User (401 if not found/inactive)."""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _check_investigation_access(db: Session, investigation_id: int, user_id: int):
    """Goal: return (investigation, permission). 404 if missing, 403 if not a member. Input: db, investigation_id, user_id. Output: (investigation, permission)."""
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    permission = task_service.get_user_permission(db, investigation_id, user_id)
    if permission is None:
        raise HTTPException(status_code=403, detail="Access denied")
    return investigation, permission


def _load_document_with_access(db: Session, document_id: int, user_id: int):
    """Goal: load the document and check access via its investigation. Input: db, document_id, user_id. Output: (document, permission) (404 if not found)."""
    document = document_service.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    _, permission = _check_investigation_access(db, document.id_investigation, user_id)
    return document, permission


#  Liste / création d'un doc pour une investigation
@router.get("/{investigation_id}/documents")
async def list_documents(
    investigation_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: list an investigation's documents. Input: investigation_id, auth, db. Output: {"documents"}."""
    _check_investigation_access(db, investigation_id, user.id_user)
    documents = document_service.list_documents(db, investigation_id)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="list_documents",
        id_user=user.id_user, detail=f"Investigation #{investigation_id}",
        ip_address=ip,
    )
    return {"documents": documents}


@router.post("/{investigation_id}/documents")
async def create_document(
    investigation_id: int,
    body: DocumentCreateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: create a document (optionally pre-filled from a template). Input: investigation_id, body, auth, db. Output: document detail (403/404 on errors)."""
    _, permission = _check_investigation_access(db, investigation_id, user.id_user)
    if not document_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions to create documents")

    # Préremplissage depuis un template
    content_html = body.content_html or ""
    if body.id_template:
        template = template_service.get_template(db, body.id_template)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        if not template_service.can_view(template, user.id_user):
            raise HTTPException(status_code=403, detail="Template not accessible")
        if not content_html:
            content_html = template.content_html

    document = document_service.create_document(
        db,
        id_investigation=investigation_id,
        title=body.title,
        content_html=content_html,
        created_by=user.id_user,
    )
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="document", action="create",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Document #{document.id_document} - {document.title} (Investigation #{investigation_id})",
        ip_address=ip,
    )
    return document_service.get_document_detail(db, document)


#  Détail / modification / suppression (par id document) 
@docs_router.get("/{document_id}")
async def get_document(
    document_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: return a document's detail. Input: document_id, auth, db. Output: document detail (403/404 on errors)."""
    document, _ = _load_document_with_access(db, document_id, user.id_user)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="view_document",
        id_user=user.id_user, detail=f"Document #{document_id}",
        ip_address=ip,
    )
    return document_service.get_document_detail(db, document)


@docs_router.patch("/{document_id}")
async def update_document(
    document_id: int,
    body: DocumentUpdateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: update a document (title and/or content). Input: document_id, body, auth, db. Output: document detail (403/422 on errors)."""
    document, permission = _load_document_with_access(db, document_id, user.id_user)
    if not document_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions to edit this document")

    if body.title is None and body.content_html is None:
        raise HTTPException(status_code=422, detail="At least one field is required")

    updated = document_service.update_document(db, document, body.title, body.content_html)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="document", action="update",
        id_user=user.id_user,
        id_investigation=document.id_investigation,
        detail=f"Document #{document_id} updated",
        ip_address=ip,
    )
    return document_service.get_document_detail(db, updated)


@docs_router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: delete a document. Input: document_id, auth, db. Output: {"detail"} (403/404 on errors)."""
    document, permission = _load_document_with_access(db, document_id, user.id_user)
    if not document_service.can_delete(permission, document, user.id_user):
        raise HTTPException(status_code=403, detail="Insufficient permissions to delete this document")

    title = document.title
    document_service.delete_document(db, document)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="document", action="delete",
        id_user=user.id_user,
        id_investigation=document.id_investigation,
        detail=f"Document #{document_id} - {title} deleted",
        ip_address=ip,
    )
    return {"detail": "Document deleted"}


#  Export PDF / DOCX 
@docs_router.get("/{document_id}/export")
async def export_document(
    document_id: int,
    format: str,
    request: Request,
    tlp: str | None = None,
    pap: str | None = None,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: export a document as PDF (with optional TLP/PAP marking). Input: document_id, format, tlp, pap, auth, db. Output: PDF file Response (400/500 on errors)."""
    if format != "pdf":
        raise HTTPException(status_code=400, detail="format must be pdf")

    document, _ = _load_document_with_access(db, document_id, user.id_user)

    from services import investigation_service
    inv = investigation_service.get_investigation_by_id(db, document.id_investigation)
    investigation_title = inv.title if inv else ""
    investigation_objectives = inv.objectives if inv else None

    try:
        data, filename = export_service.render_pdf(
            document, db,
            tlp=tlp, pap=pap,
            investigation_title=investigation_title,
            investigation_objectives=investigation_objectives,
        )
        media_type = "application/pdf"
    except Exception:
        raise HTTPException(status_code=500, detail="Export failed")

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="document", action=f"export_{format}",
        id_user=user.id_user, detail=f"Document #{document_id}",
        ip_address=ip,
    )

    encoded = quote(filename)
    headers = {"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"}
    return Response(content=data, media_type=media_type, headers=headers)


@docs_router.get("/{document_id}/comments")
async def list_comments(
    document_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: list a document's comments. Input: document_id, auth, db. Output: {"comments"}."""
    _load_document_with_access(db, document_id, user.id_user)
    comments = document_service.list_comments(db, document_id)
    return {"comments": comments}


@docs_router.post("/{document_id}/comments")
async def create_comment(
    document_id: int,
    body: DocumentCommentCreateRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: add a comment to a document. Input: document_id, body, auth, db. Output: the created comment (403 on insufficient perms)."""
    _, permission = _load_document_with_access(db, document_id, user.id_user)
    if not document_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions to comment")

    comment = document_service.create_comment(
        db,
        id_document=document_id,
        comment_id=body.comment_id,
        quote=body.quote,
        content=body.content,
        author_id=user.id_user,
    )
    return {
        "id_comment": comment.id_comment,
        "id_document": comment.id_document,
        "comment_id": comment.comment_id,
        "quote": comment.quote,
        "content": comment.content,
        "author_id": comment.author_id,
        "author_pseudo": user.pseudo,
        "resolved": comment.resolved,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
    }


@docs_router.post("/{document_id}/comments/{comment_id}/resolve")
async def toggle_resolve_comment(
    document_id: int,
    comment_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: toggle a comment's resolved flag. Input: document_id, comment_id, auth, db. Output: {"id_comment", "resolved"} (403/404 on errors)."""
    _, permission = _load_document_with_access(db, document_id, user.id_user)
    if not document_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    comment = document_service.get_comment(db, comment_id)
    if not comment or comment.id_document != document_id:
        raise HTTPException(status_code=404, detail="Comment not found")

    updated = document_service.toggle_resolved(db, comment)
    return {"id_comment": updated.id_comment, "resolved": updated.resolved}


@docs_router.post("/{document_id}/backups")
async def create_backup(
    document_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: create a manual backup of a document. Input: document_id, auth, db. Output: {"id_backup", "created_at"} (403 on insufficient perms)."""
    document, permission = _load_document_with_access(db, document_id, user.id_user)
    if not document_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    backup = document_service.create_backup(db, document, user.id_user)
    ip = request.client.host if request.client else None
    log_service.create_log(db, category="document", action="backup_create",
        id_user=user.id_user, detail=f"Document #{document_id} backup #{backup.id_backup}", ip_address=ip)
    return {"id_backup": backup.id_backup, "created_at": backup.created_at.isoformat()}


@docs_router.get("/{document_id}/backups")
async def list_backups(
    document_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: list a document's backups. Input: document_id, auth, db. Output: {"backups"} (403 on insufficient perms)."""
    document, permission = _load_document_with_access(db, document_id, user.id_user)
    if not document_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return {"backups": document_service.list_backups(db, document.id_document)}


@docs_router.get("/{document_id}/backups/{backup_id}")
async def get_backup(
    document_id: int,
    backup_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: return a backup's full content. Input: document_id, backup_id, auth, db. Output: backup dict (403/404 on errors)."""
    document, permission = _load_document_with_access(db, document_id, user.id_user)
    if not document_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    backup = document_service.get_backup(db, backup_id)
    if not backup or backup.id_document != document.id_document:
        raise HTTPException(status_code=404, detail="Backup not found")
    return {
        "id_backup": backup.id_backup,
        "title": backup.title,
        "content_html": backup.content_html,
        "kind": backup.kind,
        "pinned": backup.pinned,
        "created_at": backup.created_at.isoformat() if backup.created_at else None,
    }


@docs_router.post("/{document_id}/backups/{backup_id}/pin")
async def toggle_pin_backup(
    document_id: int,
    backup_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: pin/unpin a backup (protects it from retention). Input: document_id, backup_id, auth, db. Output: {"id_backup", "pinned"} (403/404/409 on errors)."""
    document, permission = _load_document_with_access(db, document_id, user.id_user)
    if not document_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    backup = document_service.get_backup(db, backup_id)
    if not backup or backup.id_document != document.id_document:
        raise HTTPException(status_code=404, detail="Backup not found")
    try:
        updated = document_service.toggle_pin(db, backup)
    except document_service.PinLimitError:
        raise HTTPException(
            status_code=409,
            detail=f"Maximum {document_service.MAX_PINNED_BACKUPS} pinned backups reached",
        )
    ip = request.client.host if request.client else None
    action = "backup_pin" if updated.pinned else "backup_unpin"
    log_service.create_log(db, category="document", action=action,
        id_user=user.id_user, detail=f"Document #{document_id} backup #{backup_id}", ip_address=ip)
    return {"id_backup": updated.id_backup, "pinned": updated.pinned}


@docs_router.post("/{document_id}/backups/{backup_id}/restore")
async def restore_backup(
    document_id: int,
    backup_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: restore a document from a backup. Input: document_id, backup_id, auth, db. Output: document detail (403/404 on errors)."""
    document, permission = _load_document_with_access(db, document_id, user.id_user)
    if not document_service.can_write(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    backup = document_service.get_backup(db, backup_id)
    if not backup or backup.id_document != document.id_document:
        raise HTTPException(status_code=404, detail="Backup not found")
    updated = document_service.restore_backup(db, document, backup)
    ip = request.client.host if request.client else None
    log_service.create_log(db, category="document", action="backup_restore",
        id_user=user.id_user, detail=f"Document #{document_id} restored from backup #{backup_id}", ip_address=ip)
    return document_service.get_document_detail(db, updated)


@docs_router.delete("/{document_id}/comments/{comment_id}")
async def delete_comment(
    document_id: int,
    comment_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: delete a comment (author or owner). Input: document_id, comment_id, auth, db. Output: {"detail"} (403/404 on errors)."""
    _, permission = _load_document_with_access(db, document_id, user.id_user)
    comment = document_service.get_comment(db, comment_id)
    if not comment or comment.id_document != document_id:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Auteur ou owner de l'investigation
    is_author = comment.author_id == user.id_user
    if not is_author and permission != "owner":
        raise HTTPException(status_code=403, detail="Only the author or investigation owner can delete this comment")

    document_service.delete_comment(db, comment)
    return {"detail": "Comment deleted"}
