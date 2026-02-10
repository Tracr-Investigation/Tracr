from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from services import user_service, log_service
from utils.security import verify_token
from app.dependencies import get_db

router = APIRouter(prefix="/admin")


def verify_admin(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Dependency that verifies the user is admin or super-admin"""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    role = user_service.get_user_role(db, user.id_user)
    if role not in ("admin", "super-admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    return user


@router.get("/users")
async def get_admin_users(
    request: Request,
    page: int = 1,
    limit: int = 10,
    search: str = "",
    user=Depends(verify_admin),
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else None
    log_service.create_log(db, "admin", "view_users", id_user=user.id_user, ip_address=ip)

    skip = (page - 1) * limit
    users = user_service.get_users_paginated(db, skip, limit, search)
    total = user_service.count_users(db, search)

    return {"users": users, "total": total, "page": page, "limit": limit}


@router.get("/logs")
async def get_admin_logs(
    request: Request,
    page: int = 1,
    limit: int = 10,
    category: str = "",
    search: str = "",
    user=Depends(verify_admin),
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else None
    log_service.create_log(db, "admin", "view_logs", id_user=user.id_user, ip_address=ip)

    skip = (page - 1) * limit
    logs = log_service.get_logs_paginated(db, skip, limit, category, search)
    total = log_service.count_logs(db, category, search)
    categories = log_service.get_categories(db)

    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "categories": categories,
    }
