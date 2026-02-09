from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session
import bcrypt
from models.user import User
from models.role import Role, UserRole
from typing import Optional


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_user_by_pseudo(db: Session, pseudo: str) -> Optional[User]:
    """Récupérer un user par pseudo"""
    return db.query(User).filter(User.pseudo == pseudo).first()


def authenticate_user(db: Session, pseudo: str, password: str) -> Optional[User]:
    """Authentifier un utilisateur"""
    user = get_user_by_pseudo(db, pseudo)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Récupérer un utilisateur par son ID"""
    return db.query(User).filter(User.id_user == user_id).first()


def create_user(db: Session, pseudo: str, password: str) -> User:
    """Créer un nouvel utilisateur"""
    user = User(
        pseudo=pseudo,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_role(db: Session, user_id: int) -> str:
    """Récupérer le rôle d'un utilisateur"""
    role = (
        db.query(Role.name)
        .join(UserRole, UserRole.id_role == Role.id_role)
        .filter(UserRole.id_user == user_id)
        .first()
    )
    return role[0] if role else "user"


def update_password(db: Session, user: User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    db.add(user)
    db.commit()


def update_last_login(db: Session, user: User) -> None:
    user.last_login_at = datetime.now(ZoneInfo("Europe/Paris"))
    db.add(user)
    db.commit()