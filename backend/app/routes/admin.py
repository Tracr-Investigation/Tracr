import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlmodel import Session

from services import user_service, log_service, status_service, category_service, update_service
from utils.security import verify_token
from utils.schemas import StatusCreateRequest, StatusUpdateRequest, CategoryCreateRequest, CategoryUpdateRequest, AdminResetPasswordRequest, AdminCreateUserRequest
from app.dependencies import get_db

router = APIRouter(prefix="/admin")


def verify_admin(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Goal: ensure the user is admin or super-admin. Input: token payload, db. Output: User (401/403 on errors)."""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    role = user_service.get_user_role(db, user.id_user)
    if role not in ("admin", "super-admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    return user


def verify_superadmin(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Goal: restrict access to super-admin only (code updates). Input: token payload, db. Output: User (401/403 on errors)."""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    role = user_service.get_user_role(db, user.id_user)
    if role != "super-admin":
        raise HTTPException(status_code=403, detail="Access denied")

    return user


@router.get("/update/status")
async def get_update_status(
        force: bool = False,
        user=Depends(verify_superadmin),
):
    """Goal: code update status vs GitHub (read-only). Input: force, auth. Output: status dict."""
    return await asyncio.to_thread(update_service.get_update_status, force)


@router.post("/update/apply")
async def apply_update(
        request: Request,
        admin=Depends(verify_superadmin),
        db: Session = Depends(get_db),
):
    """Goal: request applying the update (run by the host agent). Input: request, auth, db. Output: apply state (400/409/503 on errors)."""
    status = await asyncio.to_thread(update_service.get_update_status, True)

    if status.get("error") in ("rate_limited", "github_unreachable"):
        raise HTTPException(status_code=503, detail="Cannot reach GitHub to determine target version")
    if not status.get("known"):
        raise HTTPException(status_code=409, detail="Current version unknown, cannot apply update")
    if status.get("up_to_date"):
        raise HTTPException(status_code=400, detail="Already up to date")

    flags = status.get("flags", {})
    if flags.get("rebuild") or flags.get("deps"):
        raise HTTPException(
            status_code=409,
            detail="This update changes dependencies or infrastructure and requires a manual rebuild on the host (git pull && docker compose up -d --build)",
        )

    target_sha = status.get("latest_sha")
    try:
        apply_state = await asyncio.to_thread(
            update_service.request_apply, admin.id_user, admin.pseudo, target_sha
        )
    except update_service.UpdateInProgressError:
        raise HTTPException(status_code=409, detail="An update is already pending or running")

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="admin", action="update_apply_requested",
        id_user=admin.id_user,
        detail=f"Requested code update to {target_sha}",
        ip_address=ip,
    )
    return apply_state


@router.get("/update/backups")
async def list_db_backups(user=Depends(verify_superadmin)):
    """Goal: list the DB SQL backups (made before each update). Input: auth. Output: {"backups"}."""
    return {"backups": await asyncio.to_thread(update_service.list_backups)}


@router.get("/update/backups/{name}/download")
async def download_db_backup(name: str, user=Depends(verify_superadmin)):
    """Goal: download a DB SQL backup file. Input: name, auth. Output: file Response (404 if not found)."""
    path = update_service.backup_path(name)
    if not path:
        raise HTTPException(status_code=404, detail="Backup not found")
    return FileResponse(str(path), media_type="application/sql", filename=name)


@router.delete("/update/backups/{name}")
async def delete_db_backup(
        name: str,
        request: Request,
        admin=Depends(verify_superadmin),
        db: Session = Depends(get_db),
):
    """Goal: delete a DB SQL backup. Input: name, auth, db. Output: {"detail"} (404 if not found)."""
    deleted = await asyncio.to_thread(update_service.delete_backup, name)
    if not deleted:
        raise HTTPException(status_code=404, detail="Backup not found")
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="admin", action="update_backup_delete",
        id_user=admin.id_user, detail=f"Deleted DB backup {name}", ip_address=ip,
    )
    return {"detail": "Backup deleted"}


@router.get("/users")
async def get_admin_users(
        page: int = 1,
        limit: int = 10,
        search: str = "",
        user=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: list users (paginated, searchable). Input: page, limit, search, auth, db. Output: {"users", "total", "filtered", "page", "limit"}."""
    skip = (page - 1) * limit
    users = user_service.get_users_paginated(db, skip, limit, search)
    total = user_service.count_users(db)
    filtered = user_service.count_users(db, search)

    return {"users": users, "total": total, "filtered": filtered, "page": page, "limit": limit}


@router.post("/users")
async def create_admin_user(
        body: AdminCreateUserRequest,
        request: Request,
        admin=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: create an admin user. Input: body (pseudo/password), auth, db. Output: {"id_user", "pseudo", "role"} (409 if pseudo taken)."""
    existing = user_service.get_user_by_pseudo(db, body.pseudo)
    if existing:
        raise HTTPException(status_code=409, detail="This username is already taken")

    try:
        user = user_service.create_admin_user(db, body.pseudo, body.password)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="auth", action="admin_create_user",
        id_user=admin.id_user,
        detail=f"Created admin user #{user.id_user} ({user.pseudo})",
        ip_address=ip,
    )
    return {"id_user": user.id_user, "pseudo": user.pseudo, "role": "admin"}


@router.delete("/users/{user_id}")
async def delete_user(
        user_id: int,
        request: Request,
        admin=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: hard-delete a user (not super-admin, not self). Input: user_id, auth, db. Output: {"detail"} (400/403/404 on errors)."""
    target = user_service.get_user_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target_role = user_service.get_user_role(db, target.id_user)
    if target_role == "super-admin":
        raise HTTPException(status_code=403, detail="Super-admin account cannot be deleted")

    if target.id_user == admin.id_user:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    pseudo = target.pseudo
    user_service.hard_delete_user(db, target)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="auth", action="admin_delete_user",
        id_user=admin.id_user,
        detail=f"Deleted user ({pseudo})",
        ip_address=ip,
    )
    return {"detail": "User deleted"}


@router.post("/users/{user_id}/reset-password")
async def admin_reset_user_password(
        user_id: int,
        body: AdminResetPasswordRequest,
        request: Request,
        admin=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: reset a user's password (admin). Input: user_id, body, auth, db. Output: {"detail"} (403/404 on errors)."""
    target = user_service.get_user_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target_role = user_service.get_user_role(db, target.id_user)
    if target_role == "super-admin":
        raise HTTPException(status_code=403, detail="Super-admin password cannot be reset through this endpoint")

    user_service.admin_reset_password(db, target, body.new_password)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="auth", action="admin_reset_password",
        id_user=admin.id_user,
        detail=f"Reset password for user #{user_id} ({target.pseudo})",
        ip_address=ip,
    )
    return {"detail": "Password reset successfully"}


@router.get("/logs")
async def get_admin_logs(
        page: int = 1,
        limit: int = 10,
        category: str = "",
        search: str = "",
        exclude_reads: bool = False,
        user=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: list audit logs (paginated, filterable). Input: page, limit, category, search, exclude_reads, auth, db. Output: {"logs", "total", "filtered", "page", "limit", "categories"}."""
    skip = (page - 1) * limit
    logs = log_service.get_logs_paginated(db, skip, limit, category, search, exclude_reads)
    total = log_service.count_logs(db, exclude_reads=exclude_reads)
    filtered = log_service.count_logs(db, category, search, exclude_reads)
    categories = log_service.get_categories(db)

    return {
        "logs": logs,
        "total": total,
        "filtered": filtered,
        "page": page,
        "limit": limit,
        "categories": categories,
    }


@router.get("/statuses")
async def get_admin_statuses(
        user=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: list investigation statuses. Input: auth, db. Output: {"statuses", "total"}."""
    statuses = status_service.get_all_statuses(db)
    total = status_service.count_statuses(db)
    return {"statuses": statuses, "total": total}


@router.post("/statuses")
async def create_admin_status(
        body: StatusCreateRequest,
        user=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: create an investigation status. Input: body (name/color), auth, db. Output: the created status."""
    status = status_service.create_status(db, name=body.name, color=body.color)
    return {"id_status": status.id_status, "name": status.name, "color": status.color}


@router.put("/statuses/{status_id}")
async def update_admin_status(
        status_id: int,
        body: StatusUpdateRequest,
        user=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: update an investigation status. Input: status_id, body, auth, db. Output: the updated status (404 if not found)."""
    status = status_service.get_status_by_id(db, status_id)
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    updated = status_service.update_status(db, status, name=body.name, color=body.color)
    return {"id_status": updated.id_status, "name": updated.name, "color": updated.color}


@router.delete("/statuses/{status_id}")
async def delete_admin_status(
        status_id: int,
        user=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: delete an investigation status. Input: status_id, auth, db. Output: {"detail"} (404 if not found)."""
    status = status_service.get_status_by_id(db, status_id)
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    status_service.delete_status(db, status)
    return {"detail": "Status deleted"}


@router.get("/categories")
async def get_admin_categories(
        user=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: list investigation categories. Input: auth, db. Output: {"categories", "total"}."""
    categories = category_service.get_all_categories(db)
    total = category_service.count_categories(db)
    return {"categories": categories, "total": total}


@router.post("/categories")
async def create_admin_category(
        body: CategoryCreateRequest,
        request: Request,
        user=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: create an investigation category. Input: body (name/color/icon), auth, db. Output: the created category."""
    cat = category_service.create_category(db, name=body.name, color=body.color, icon=body.icon)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="category", action="create", id_user=user.id_user,
        detail=f"Category #{cat.id_category} - {cat.name}", ip_address=ip,
    )
    return {"id_category": cat.id_category, "name": cat.name, "color": cat.color, "icon": cat.icon}


@router.put("/categories/{category_id}")
async def update_admin_category(
        category_id: int,
        body: CategoryUpdateRequest,
        request: Request,
        user=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: update an investigation category. Input: category_id, body, auth, db. Output: the updated category (404 if not found)."""
    cat = category_service.get_category_by_id(db, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    updated = category_service.update_category(db, cat, name=body.name, color=body.color, icon=body.icon)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="category", action="update", id_user=user.id_user,
        detail=f"Category #{updated.id_category} - {updated.name}", ip_address=ip,
    )
    return {"id_category": updated.id_category, "name": updated.name, "color": updated.color, "icon": updated.icon}


@router.delete("/categories/{category_id}")
async def delete_admin_category(
        category_id: int,
        request: Request,
        user=Depends(verify_admin),
        db: Session = Depends(get_db),
):
    """Goal: delete an investigation category. Input: category_id, auth, db. Output: {"detail"} (404 if not found)."""
    cat = category_service.get_category_by_id(db, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat_name = cat.name
    category_service.delete_category(db, cat)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="category", action="delete", id_user=user.id_user,
        detail=f"Category #{category_id} - {cat_name}", ip_address=ip,
    )
    return {"detail": "Category deleted"}
