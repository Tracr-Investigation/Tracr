from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from services import user_service
from utils.security import verify_token
from app.dependencies import get_db

router = APIRouter(prefix="/admin")


@router.get("/users")
async def get_admin_users(
    request: Request,
    page: int = 1,
    limit: int = 10,
    search: str = "",
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    role = user_service.get_user_role(db, user.id_user)
    if role not in ("admin", "super-admin"):
        raise HTTPException(status_code=403, detail="Access denied")

    skip = (page - 1) * limit
    users = user_service.get_users_paginated(db, skip, limit, search)
    total = user_service.count_users(db, search)

    return {"users": users, "total": total, "page": page, "limit": limit}
