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
    id_investigation: Optional[int] = None,
    detail: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> Log:
    """Create a new log entry"""
    log = Log(
        id_user=id_user,
        id_investigation=id_investigation,
        category=category,
        action=action,
        detail=detail,
        ip_address=ip_address,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def _apply_exclude_reads(query, exclude_reads: bool):
    if exclude_reads:
        query = query.filter(Log.category != "consultation")
    return query


def get_logs_paginated(db: Session, skip: int, limit: int, category: str = "", search: str = "", exclude_reads: bool = False):
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
    query = _apply_exclude_reads(query, exclude_reads)
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


def count_logs(db: Session, category: str = "", search: str = "", exclude_reads: bool = False) -> int:
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
    query = _apply_exclude_reads(query, exclude_reads)
    return query.count()


def get_recent_investigation_ids(db: Session, user_id: int, limit: int = 8) -> list[int]:
    """Get the IDs of recently viewed investigations for a user, ordered by most recent consultation"""
    import re
    rows = (
        db.query(Log.detail, Log.created_at)
        .filter(
            Log.id_user == user_id,
            Log.action == "view_investigation",
            Log.detail.isnot(None),
        )
        .order_by(Log.created_at.desc())
        .all()
    )
    seen = set()
    result = []
    for detail, _ in rows:
        match = re.search(r"#(\d+)", detail)
        if match:
            inv_id = int(match.group(1))
            if inv_id not in seen:
                seen.add(inv_id)
                result.append(inv_id)
                if len(result) >= limit:
                    break
    return result


def get_categories(db: Session) -> list[str]:
    """Get all distinct log categories"""
    rows = db.query(Log.category).distinct().order_by(Log.category).all()
    return [row[0] for row in rows]


def get_timeline_for_investigation(
    db: Session,
    investigation_id: int,
    skip: int = 0,
    limit: int = 50,
    category: str = "",
) -> list[dict]:
    """Get activity timeline for a specific investigation, excluding read-only consultations"""
    query = (
        db.query(Log, User.pseudo)
        .outerjoin(User, Log.id_user == User.id_user)
        .filter(
            Log.id_investigation == investigation_id,
            Log.category != "consultation",
        )
    )
    if category:
        query = query.filter(Log.category == category)
    rows = (
        query.order_by(Log.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id_log": log.id_log,
            "id_user": log.id_user,
            "pseudo": pseudo,
            "category": log.category,
            "action": log.action,
            "detail": log.detail,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log, pseudo in rows
    ]


def count_timeline_for_investigation(db: Session, investigation_id: int, category: str = "") -> int:
    query = db.query(Log).filter(
        Log.id_investigation == investigation_id,
        Log.category != "consultation",
    )
    if category:
        query = query.filter(Log.category == category)
    return query.count()


def get_timeline_categories(db: Session, investigation_id: int) -> list[str]:
    """Catégories distinctes présentes dans la timeline d'une enquête."""
    rows = (
        db.query(Log.category)
        .filter(
            Log.id_investigation == investigation_id,
            Log.category != "consultation",
        )
        .distinct()
        .order_by(Log.category)
        .all()
    )
    return [r[0] for r in rows]
