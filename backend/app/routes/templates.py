from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from services import user_service, log_service, template_service
from utils.security import verify_token
from utils.schemas import TemplateCreateRequest, TemplateUpdateRequest
from app.dependencies import get_db, limiter

router = APIRouter(prefix="/templates")


def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.get("")
async def list_templates(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    templates = template_service.list_templates(db, user.id_user)
    return {"templates": templates}


@router.post("")
@limiter.limit("20/minute")
async def create_template(
    body: TemplateCreateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = template_service.create_template(
        db,
        name=body.name,
        description=body.description or "",
        content_html=body.content_html or "",
        is_public=body.is_public,
        created_by=user.id_user,
    )
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="template", action="create",
        id_user=user.id_user,
        detail=f"Template #{template.id_template} - {template.name}",
        ip_address=ip,
    )
    return template_service.get_template_detail(db, template.id_template, user.id_user)


@router.get("/{template_id}")
async def get_template(
    template_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = template_service.get_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if not template_service.can_view(template, user.id_user):
        raise HTTPException(status_code=404, detail="Template not found")
    return template_service.get_template_detail(db, template.id_template, user.id_user)


@router.patch("/{template_id}")
@limiter.limit("30/minute")
async def update_template(
    template_id: int,
    body: TemplateUpdateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = template_service.get_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    role = user_service.get_user_role(db, user.id_user)
    is_admin = role in ("admin", "super-admin")
    if not template_service.can_modify(template, user.id_user) and not is_admin:
        raise HTTPException(status_code=403, detail="Only the creator can modify this template")

    if all(v is None for v in (body.name, body.description, body.content_html, body.is_public)):
        raise HTTPException(status_code=422, detail="At least one field is required")

    updated = template_service.update_template(
        db, template, body.name, body.description, body.content_html, body.is_public
    )
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="template", action="update",
        id_user=user.id_user,
        detail=f"Template #{template_id} updated",
        ip_address=ip,
    )
    return template_service.get_template_detail(db, updated.id_template, user.id_user)


@router.delete("/{template_id}")
@limiter.limit("10/minute")
async def delete_template(
    template_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = template_service.get_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    role = user_service.get_user_role(db, user.id_user)
    is_admin = role in ("admin", "super-admin")
    if not template_service.can_modify(template, user.id_user) and not is_admin:
        raise HTTPException(status_code=403, detail="Only the creator can delete this template")

    name = template.name
    template_service.delete_template(db, template)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="template", action="delete",
        id_user=user.id_user,
        detail=f"Template #{template_id} - {name} deleted",
        ip_address=ip,
    )
    return {"detail": "Template deleted"}
