from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from services import user_service, log_service, template_service
from utils.security import verify_token
from utils.schemas import (
    TemplateCreateRequest, TemplateUpdateRequest,
    TemplateCategoryCreateRequest, TemplateCategoryUpdateRequest,
)
from app.dependencies import get_db, limiter

router = APIRouter(prefix="/templates")


def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Goal: resolve and validate the authenticated user from the JWT. Input: token payload, db. Output: User (401 if not found/inactive)."""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_admin(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Goal: ensure the user has an admin role. Input: auth, db. Output: User (403 if not admin)."""
    role = user_service.get_user_role(db, user.id_user)
    if role not in ("admin", "super-admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ── Template category routes ─────────────────────────────────────────────────

@router.get("/categories")
async def list_template_categories(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: list template categories. Input: auth, db. Output: {"categories"}."""
    return {"categories": template_service.list_template_categories(db)}


@router.post("/categories")
@limiter.limit("20/minute")
async def create_template_category(
    body: TemplateCategoryCreateRequest,
    request: Request,
    user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Goal: create a template category (admin). Input: body (name/color/icon), auth, db. Output: the created category."""
    cat = template_service.create_template_category(db, body.name, body.color, body.icon)
    log_service.create_log(
        db, category="template", action="create_category",
        id_user=user.id_user,
        detail=f"Template category #{cat.id_category_template} - {cat.name}",
        ip_address=request.client.host if request.client else None,
    )
    return template_service._category_to_dict(cat)


@router.patch("/categories/{cat_id}")
@limiter.limit("20/minute")
async def update_template_category(
    cat_id: int,
    body: TemplateCategoryUpdateRequest,
    request: Request,
    user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Goal: update a template category (admin). Input: cat_id, body, auth, db. Output: the updated category (404 if not found)."""
    cat = template_service.get_template_category(db, cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    updated = template_service.update_template_category(db, cat, body.name, body.color, body.icon)
    log_service.create_log(
        db, category="template", action="update_category",
        id_user=user.id_user,
        detail=f"Template category #{cat_id} updated",
        ip_address=request.client.host if request.client else None,
    )
    return template_service._category_to_dict(updated)


@router.delete("/categories/{cat_id}")
@limiter.limit("10/minute")
async def delete_template_category(
    cat_id: int,
    request: Request,
    user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Goal: delete a template category (admin). Input: cat_id, auth, db. Output: {"detail"} (404 if not found)."""
    cat = template_service.get_template_category(db, cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    name = cat.name
    template_service.delete_template_category(db, cat)
    log_service.create_log(
        db, category="template", action="delete_category",
        id_user=user.id_user,
        detail=f"Template category - {name} deleted",
        ip_address=request.client.host if request.client else None,
    )
    return {"detail": "Category deleted"}


# ── Template routes ──────────────────────────────────────────────────────────

@router.get("")
async def list_templates(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: list templates visible to the user. Input: auth, db. Output: {"templates"}."""
    return {"templates": template_service.list_templates(db, user.id_user)}


@router.post("")
@limiter.limit("20/minute")
async def create_template(
    body: TemplateCreateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: create a template. Input: body, auth, db. Output: the created template detail."""
    template = template_service.create_template(
        db,
        name=body.name,
        description=body.description or "",
        content_html=body.content_html or "",
        is_public=body.is_public,
        created_by=user.id_user,
        id_category_template=body.id_category_template,
    )
    log_service.create_log(
        db, category="template", action="create",
        id_user=user.id_user,
        detail=f"Template #{template.id_template} - {template.name}",
        ip_address=request.client.host if request.client else None,
    )
    return template_service.get_template_detail(db, template.id_template, user.id_user)


@router.get("/{template_id}")
async def get_template(
    template_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: fetch a template detail if viewable. Input: template_id, auth, db. Output: template detail (404 if not found/not allowed)."""
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
    """Goal: update a template (creator or admin). Input: template_id, body, auth, db. Output: updated detail (403/404/422 on errors)."""
    template = template_service.get_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    role = user_service.get_user_role(db, user.id_user)
    is_admin = role in ("admin", "super-admin")
    if not template_service.can_modify(template, user.id_user) and not is_admin:
        raise HTTPException(status_code=403, detail="Only the creator can modify this template")

    if all(v is None for v in (body.name, body.description, body.content_html, body.is_public)) and not body.clear_category and body.id_category_template is None:
        raise HTTPException(status_code=422, detail="At least one field is required")

    updated = template_service.update_template(
        db, template, body.name, body.description, body.content_html, body.is_public,
        id_category_template=body.id_category_template,
        clear_category=body.clear_category,
    )
    log_service.create_log(
        db, category="template", action="update",
        id_user=user.id_user,
        detail=f"Template #{template_id} updated",
        ip_address=request.client.host if request.client else None,
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
    """Goal: delete a template (creator or admin). Input: template_id, auth, db. Output: {"detail"} (403/404 on errors)."""
    template = template_service.get_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    role = user_service.get_user_role(db, user.id_user)
    is_admin = role in ("admin", "super-admin")
    if not template_service.can_modify(template, user.id_user) and not is_admin:
        raise HTTPException(status_code=403, detail="Only the creator can delete this template")

    name = template.name
    template_service.delete_template(db, template)
    log_service.create_log(
        db, category="template", action="delete",
        id_user=user.id_user,
        detail=f"Template #{template_id} - {name} deleted",
        ip_address=request.client.host if request.client else None,
    )
    return {"detail": "Template deleted"}
