from typing import Optional
from sqlalchemy.orm import Session
from models.notification import Notification


def create_notification(
    db: Session,
    id_user: int,
    type: str,
    title: str,
    message: Optional[str] = None,
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
) -> dict:
    """Goal: persist a notification for a user. Input: db, id_user, type, title, message, reference_id, reference_type. Output: the notification dict."""
    notification = Notification(
        id_user=id_user,
        type=type,
        title=title,
        message=message,
        reference_id=reference_id,
        reference_type=reference_type,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return _to_dict(notification)


def get_notifications_by_user(
    db: Session, id_user: int, skip: int = 0, limit: int = 50
) -> list[dict]:
    """Goal: list a user's notifications (newest first, paginated). Input: db, id_user, skip, limit. Output: list of notification dicts."""
    rows = (
        db.query(Notification)
        .filter(Notification.id_user == id_user)
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_to_dict(n) for n in rows]


def count_unread(db: Session, id_user: int) -> int:
    """Goal: count a user's unread notifications. Input: db, id_user. Output: int."""
    return (
        db.query(Notification)
        .filter(Notification.id_user == id_user, Notification.is_read == False)
        .count()
    )


def mark_as_read(db: Session, id_notification: int, id_user: int) -> Optional[dict]:
    """Goal: mark one notification as read (must belong to the user). Input: db, id_notification, id_user. Output: the notification dict or None."""
    notification = (
        db.query(Notification)
        .filter(Notification.id_notification == id_notification, Notification.id_user == id_user)
        .first()
    )
    if not notification:
        return None
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return _to_dict(notification)


def mark_all_as_read(db: Session, id_user: int) -> int:
    """Goal: mark all a user's notifications as read. Input: db, id_user. Output: count of updated rows."""
    count = (
        db.query(Notification)
        .filter(Notification.id_user == id_user, Notification.is_read == False)
        .update({"is_read": True})
    )
    db.commit()
    return count


def _to_dict(notification: Notification) -> dict:
    """Goal: serialize a Notification to a dict. Input: notification. Output: dict."""
    return {
        "id_notification": notification.id_notification,
        "id_user": notification.id_user,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "reference_id": notification.reference_id,
        "reference_type": notification.reference_type,
        "is_read": notification.is_read,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
    }
