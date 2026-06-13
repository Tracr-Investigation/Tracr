"""source_service.py -- logique metier des sources archivees (preuves OSINT).

Une "source" est une capture d'un contenu externe (page web, screenshot, MHTML,
image ou video) rattachee a une enquete. Le binaire est depose dans MinIO via
storage_service ; la base ne garde que les metadonnees et l'empreinte SHA-256
garantissant l'integrite de la preuve.
"""
import hashlib
import hmac
import uuid
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from config import settings
from models.source import InvestigationSource
from models.user import User
from services import storage_service

# Types de capture acceptes
SOURCE_TYPES = frozenset({"page_screenshot", "page_mhtml", "media", "web_archive"})

# Extension de fichier conseillee par type MIME courant (pour la cle de stockage)
_EXT_BY_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "application/pdf": ".pdf",
    "multipart/related": ".mhtml",
    "message/rfc822": ".mhtml",
    "text/html": ".html",
}


def _now() -> datetime:
    return datetime.now(ZoneInfo("Europe/Paris"))


def view_signature(source: InvestigationSource) -> str:
    """Signature HMAC stable (sans expiration) autorisant la lecture d'UNE source
    via une URL http — pour embarquer images/captures dans un document (le
    sanitizer bloque data:/blob:). Ne révèle pas le JWT de l'utilisateur."""
    msg = f"{source.id_source}:{source.content_hash}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()[:32]


def verify_view_signature(source: InvestigationSource, sig: str) -> bool:
    return hmac.compare_digest(sig or "", view_signature(source))


# Permissions (memes regles que les documents)
def can_write(permission: Optional[str]) -> bool:
    """owner / manager / editeur peuvent ajouter des sources."""
    return permission in ("owner", "manager", "editeur")


def can_delete(permission: Optional[str], source: InvestigationSource, user_id: int) -> bool:
    """L'owner de l'enquete ou le createur de la source peuvent supprimer."""
    return permission == "owner" or source.created_by == user_id


def is_valid_type(source_type: str) -> bool:
    return source_type in SOURCE_TYPES


def _storage_key(id_investigation: int, mime_type: str) -> str:
    ext = _EXT_BY_MIME.get(mime_type, "")
    return f"sources/{id_investigation}/{uuid.uuid4().hex}{ext}"


def create_source(
    db: Session,
    *,
    id_investigation: int,
    created_by: int,
    title: str,
    source_url: str,
    source_type: str,
    mime_type: str,
    content: bytes,
    captured_at: datetime,
    capture_group: Optional[str] = None,
    page_metadata: Optional[dict] = None,
) -> InvestigationSource:
    """Calcule le hash, depose le binaire dans MinIO et persiste la source.

    Args:
        content (bytes): contenu binaire de la capture.

    Returns:
        InvestigationSource: la source creee.
    """
    content_hash = hashlib.sha256(content).hexdigest()
    storage_key = _storage_key(id_investigation, mime_type)

    storage_service.put_object(storage_key, content, mime_type)

    source = InvestigationSource(
        id_investigation=id_investigation,
        created_by=created_by,
        title=title,
        source_url=source_url,
        source_type=source_type,
        mime_type=mime_type,
        size_bytes=len(content),
        content_hash=content_hash,
        storage_key=storage_key,
        capture_group=capture_group,
        page_metadata=page_metadata,
        captured_at=captured_at,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def list_sources(db: Session, id_investigation: int) -> list[dict]:
    """Liste les sources d'une enquete, plus recentes d'abord."""
    rows = (
        db.query(InvestigationSource, User.pseudo)
        .outerjoin(User, User.id_user == InvestigationSource.created_by)
        .filter(InvestigationSource.id_investigation == id_investigation)
        .order_by(InvestigationSource.captured_at.desc())
        .all()
    )
    return [_to_dict(s, pseudo) for s, pseudo in rows]


def get_source(db: Session, id_source: int) -> Optional[InvestigationSource]:
    return db.query(InvestigationSource).filter(InvestigationSource.id_source == id_source).first()


def source_detail(db: Session, source: InvestigationSource) -> dict:
    creator = (
        db.query(User.pseudo).filter(User.id_user == source.created_by).first()
        if source.created_by else None
    )
    return _to_dict(source, creator[0] if creator else None)


def get_content(source: InvestigationSource) -> bytes:
    """Recupere le binaire de la capture depuis MinIO."""
    return storage_service.get_object(source.storage_key)


def delete_source(db: Session, source: InvestigationSource) -> None:
    """Supprime la source en base et son objet dans MinIO."""
    try:
        storage_service.remove_object(source.storage_key)
    except Exception:
        # On ne bloque pas la suppression en base si l'objet est deja absent.
        pass
    db.delete(source)
    db.commit()


def _to_dict(source: InvestigationSource, author_pseudo: Optional[str]) -> dict:
    return {
        "id_source": source.id_source,
        "id_investigation": source.id_investigation,
        "created_by": source.created_by,
        "created_by_pseudo": author_pseudo,
        "title": source.title,
        "source_url": source.source_url,
        "source_type": source.source_type,
        "mime_type": source.mime_type,
        "size_bytes": source.size_bytes,
        "content_hash": source.content_hash,
        "capture_group": source.capture_group,
        "page_metadata": source.page_metadata,
        "view_sig": view_signature(source),
        "captured_at": source.captured_at.isoformat() if source.captured_at else None,
        "created_at": source.created_at.isoformat() if source.created_at else None,
    }
