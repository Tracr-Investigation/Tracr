from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from services import notification_service, user_service, log_service
from utils.security import verify_token
from app.dependencies import get_db

router = APIRouter(prefix="/notifications")


def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.get("")
async def get_notifications(
    request: Request,
    skip: int = 0,
    limit: int = 50,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notifications = notification_service.get_notifications_by_user(db, user.id_user, skip, limit)
    unread_count = notification_service.count_unread(db, user.id_user)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="list_notifications",
        id_user=user.id_user, ip_address=ip,
    )
    return {"notifications": notifications, "unread_count": unread_count}


@router.get("/unread-count")
async def get_unread_count(
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = notification_service.count_unread(db, user.id_user)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="check_unread_count",
        id_user=user.id_user, ip_address=ip,
    )
    return {"unread_count": count}


@router.patch("/{id_notification}/read")
async def mark_notification_read(
    id_notification: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = notification_service.mark_as_read(db, id_notification, user.id_user)
    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="mark_as_read",
        id_user=user.id_user, detail=f"Notification #{id_notification}",
        ip_address=ip,
    )
    return result


@router.patch("/read-all")
async def mark_all_notifications_read(
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = notification_service.mark_all_as_read(db, user.id_user)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="mark_all_as_read",
        id_user=user.id_user, detail=f"{count} notifications marked as read",
        ip_address=ip,
    )
    return {"marked_count": count}
