from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session
import bcrypt
from models.user import User
from models.role import Role
from models.user_role import UserRole
from typing import Optional


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_user_by_pseudo(db: Session, pseudo: str) -> Optional[User]:
    """Get a user by username"""
    return db.query(User).filter(User.pseudo == pseudo).first()


def authenticate_user(db: Session, pseudo: str, password: str) -> Optional[User]:
    """Authenticate a user"""
    user = get_user_by_pseudo(db, pseudo)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get a user by ID"""
    return db.query(User).filter(User.id_user == user_id).first()


def create_user(db: Session, pseudo: str, password: str) -> User:
    """Create a new user"""
    user = User(
        pseudo=pseudo,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_role(db: Session, user_id: int) -> str:
    """Get a user's role"""
    role = (
        db.query(Role.name)
        .join(UserRole, UserRole.id_role == Role.id_role)
        .filter(UserRole.id_user == user_id)
        .first()
    )
    return role[0] if role else "user"


def deactivate_user(db: Session, user: User) -> None:
    """Soft delete a user account"""
    user.is_active = False
    db.add(user)
    db.commit()


def hard_delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()


def create_admin_user(db: Session, pseudo: str, password: str) -> User:
    user = User(
        pseudo=pseudo,
        password_hash=hash_password(password),
        must_change_password=True,
    )
    db.add(user)
    db.flush()

    role = db.query(Role).filter(Role.name == "admin").first()
    if role is None:
        db.rollback()
        raise ValueError("Role 'admin' not found")

    user_role = UserRole(id_user=user.id_user, id_role=role.id_role, assigned_at=datetime.now(ZoneInfo("UTC")))
    db.add(user_role)
    db.commit()
    db.refresh(user)
    return user


def update_password(db: Session, user: User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    db.add(user)
    db.commit()


def admin_reset_password(db: Session, user: User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    user.must_change_password = True
    db.add(user)
    db.commit()


def update_last_login(db: Session, user: User) -> None:
    user.last_login_at = datetime.now(ZoneInfo("UTC"))
    db.add(user)
    db.commit()


def update_language(db: Session, user: User, language: str) -> None:
    user.language = language
    db.add(user)
    db.commit()


def get_users_paginated(db: Session, skip: int, limit: int, search: str = ""):
    """Get paginated list of users with their roles"""
    query = db.query(User)
    if search:
        query = query.filter(User.pseudo.ilike(f"%{search}%"))
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for u in users:
        role = get_user_role(db, u.id_user)
        result.append({
            "id_user": u.id_user,
            "pseudo": u.pseudo,
            "role": role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
        })
    return result


def count_users(db: Session, search: str = "") -> int:
    """Count total number of users with optional search filter"""
    query = db.query(User)
    if search:
        query = query.filter(User.pseudo.ilike(f"%{search}%"))
    return query.count()