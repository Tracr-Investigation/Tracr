from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from services import user_service, log_service, status_service
from utils.security import verify_token
from utils.schemas import StatusCreateRequest, StatusUpdateRequest
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
    page: int = 1,
    limit: int = 10,
    search: str = "",
    user=Depends(verify_admin),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit
    users = user_service.get_users_paginated(db, skip, limit, search)
    total = user_service.count_users(db)
    filtered = user_service.count_users(db, search)

    return {"users": users, "total": total, "filtered": filtered, "page": page, "limit": limit}


@router.get("/logs")
async def get_admin_logs(
    page: int = 1,
    limit: int = 10,
    category: str = "",
    search: str = "",
    user=Depends(verify_admin),
    db: Session = Depends(get_db),
):
    skip = (page - 1) * limit
    logs = log_service.get_logs_paginated(db, skip, limit, category, search)
    total = log_service.count_logs(db)
    filtered = log_service.count_logs(db, category, search)
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
    statuses = status_service.get_all_statuses(db)
    total = status_service.count_statuses(db)
    return {"statuses": statuses, "total": total}


@router.post("/statuses")
async def create_admin_status(
    body: StatusCreateRequest,
    user=Depends(verify_admin),
    db: Session = Depends(get_db),
):
    status = status_service.create_status(db, name=body.name, color=body.color)
    return {"id_status": status.id_status, "name": status.name, "color": status.color}


@router.put("/statuses/{status_id}")
async def update_admin_status(
    status_id: int,
    body: StatusUpdateRequest,
    user=Depends(verify_admin),
    db: Session = Depends(get_db),
):
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
    status = status_service.get_status_by_id(db, status_id)
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    status_service.delete_status(db, status)
    return {"detail": "Status deleted"}
