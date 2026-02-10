from typing import Optional
from sqlalchemy import or_, cast, String
from sqlalchemy.orm import Session
from models.log import Log
from models.user import User


def create_log(
    db: Session,
    category: str,
    action: str,
    id_user: Optional[int] = None,
    detail: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> Log:
    """Create a new log entry"""
    log = Log(
        id_user=id_user,
        category=category,
        action=action,
        detail=detail,
        ip_address=ip_address,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_logs_paginated(db: Session, skip: int, limit: int, category: str = "", search: str = ""):
    """Get paginated logs with optional category and search filters"""
    query = db.query(Log, User.pseudo).outerjoin(User, Log.id_user == User.id_user)
    if category:
        query = query.filter(Log.category == category)
    if search:
        filters = [
            Log.action.ilike(f"%{search}%"),
            User.pseudo.ilike(f"%{search}%"),
            cast(Log.id_log, String).ilike(f"%{search}%"),
        ]
        query = query.filter(or_(*filters))
    rows = query.order_by(Log.created_at.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id_log": log.id_log,
            "id_user": log.id_user,
            "pseudo": pseudo,
            "category": log.category,
            "action": log.action,
            "detail": log.detail,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log, pseudo in rows
    ]


def count_logs(db: Session, category: str = "", search: str = "") -> int:
    """Count total logs with optional filters"""
    query = db.query(Log).outerjoin(User, Log.id_user == User.id_user)
    if category:
        query = query.filter(Log.category == category)
    if search:
        filters = [
            Log.action.ilike(f"%{search}%"),
            User.pseudo.ilike(f"%{search}%"),
            cast(Log.id_log, String).ilike(f"%{search}%"),
        ]
        query = query.filter(or_(*filters))
    return query.count()


def get_categories(db: Session) -> list[str]:
    """Get all distinct log categories"""
    rows = db.query(Log.category).distinct().order_by(Log.category).all()
    return [row[0] for row in rows]
