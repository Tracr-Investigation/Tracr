from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session
from passlib.context import CryptContext
from models.user import User
from typing import Optional

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hasher un mot de passe"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier un mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)


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


def update_last_login(db: Session, user: User) -> None:
    """Mettre à jour la date de dernière connexion"""
    user.last_login_at = datetime.now(ZoneInfo("Europe/Paris"))
    db.add(user)
    db.commit()