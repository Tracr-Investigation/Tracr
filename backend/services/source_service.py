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

from sqlalchemy import or_
from sqlalchemy.orm import Session

from config import settings
from models.source import InvestigationSource
from models.user import User
from services import ocr_service, storage_service, text_extraction_service

# Types de capture acceptes. `manual_file` = fichier ajoute manuellement par
# l'enqueteur (hors extension : document, image, PDF deposes a la main).
SOURCE_TYPES = frozenset({"page_screenshot", "page_mhtml", "media", "web_archive", "manual_file"})

# Role d'une source embarquee dans une archive HTML (image/video/audio de la page).
# Masquee de la liste principale par defaut, rattachee au parent via capture_group.
PAGE_MEDIA_ROLE = "page_media"
ROLES = frozenset({PAGE_MEDIA_ROLE})

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
    """Goal: current Europe/Paris datetime. Input: none. Output: datetime."""
    return datetime.now(ZoneInfo("Europe/Paris"))


def view_signature(source: InvestigationSource) -> str:
    """Signature HMAC stable (sans expiration) autorisant la lecture d'UNE source
    via une URL http - pour embarquer images/captures dans un document (le
    sanitizer bloque data:/blob:). Ne révèle pas le JWT de l'utilisateur."""
    msg = f"{source.id_source}:{source.content_hash}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()[:32]


def verify_view_signature(source: InvestigationSource, sig: str) -> bool:
    """Goal: constant-time check of a source view signature. Input: source, sig. Output: bool."""
    return hmac.compare_digest(sig or "", view_signature(source))


# Permissions (memes regles que les documents)
def can_write(permission: Optional[str]) -> bool:
    """owner / manager / editeur peuvent ajouter des sources."""
    return permission in ("owner", "manager", "editeur")


def can_delete(permission: Optional[str], source: InvestigationSource, user_id: int) -> bool:
    """L'owner de l'enquete ou le createur de la source peuvent supprimer."""
    return permission == "owner" or source.created_by == user_id


def is_valid_type(source_type: str) -> bool:
    """Goal: check a capture type is supported. Input: source_type. Output: bool."""
    return source_type in SOURCE_TYPES


def is_valid_role(role: Optional[str]) -> bool:
    """Goal: check a source role is valid (None or a known role). Input: role. Output: bool."""
    return role is None or role in ROLES


def _storage_key(id_investigation: int, mime_type: str) -> str:
    """Goal: build a unique MinIO object key for a source. Input: id_investigation, mime_type. Output: storage key str."""
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
    notes: Optional[str] = None,
    role: Optional[str] = None,
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

    # Les medias embarques d'une page (role=page_media) ne sont pas analyses :
    # ils ne doivent pas generer de hits ni encombrer l'OCR (anti-spam). Le
    # contenu textuel pertinent vient de l'archive HTML parente.
    if role == PAGE_MEDIA_ROLE:
        extracted_text, text_status = None, text_extraction_service.STATUS_NONE
    else:
        extracted_text, text_status = text_extraction_service.extract_text(
            content, mime_type, source_type
        )

        # OCR immediat sur les images sans texte natif : la source est persistee
        # directement avec sa version oceriseee (pas d'etape manuelle ulterieure).
        # On reutilise les bytes deja en main (pas de re-telechargement MinIO).
        if text_status == text_extraction_service.STATUS_PENDING_OCR:
            ocr_text = ocr_service.ocr_image(content)
            extracted_text = ocr_text
            text_status = (
                text_extraction_service.STATUS_EXTRACTED if ocr_text
                else text_extraction_service.STATUS_NONE
            )

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
        notes=(notes.strip() if notes else None) or None,
        extracted_text=extracted_text,
        text_status=text_status,
        captured_at=captured_at,
        role=role,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def update_source(
    db: Session,
    source: InvestigationSource,
    *,
    title: Optional[str] = None,
    notes: Optional[str] = None,
    show_in_list: Optional[bool] = None,
) -> InvestigationSource:
    """Met a jour les champs editables d'une source (titre, notes, visibilite
    d'un media de page dans la liste). Le binaire et l'empreinte restent
    immuables (integrite de la preuve)."""
    if title is not None and title.strip():
        source.title = title.strip()
    if notes is not None:
        source.notes = notes.strip() or None
    if show_in_list is not None:
        source.show_in_list = show_in_list
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def ensure_extracted_text(db: Session, source: InvestigationSource) -> InvestigationSource:
    """Analyse paresseuse : pour une source jamais traitee (`unprocessed`,
    typiquement anterieure a la feature), recupere le binaire depuis MinIO,
    extrait le texte et persiste le resultat. No-op si deja analysee."""
    if source.text_status != text_extraction_service.STATUS_UNPROCESSED:
        return source
    try:
        content = storage_service.get_object(source.storage_key)
    except Exception:
        return source  # objet indisponible : on retentera plus tard
    extracted_text, text_status = text_extraction_service.extract_text(
        content, source.mime_type, source.source_type
    )
    source.extracted_text = extracted_text
    source.text_status = text_status
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def can_ocr(source: InvestigationSource) -> bool:
    """L'OCR n'a de sens que sur une image bitmap."""
    return ocr_service.is_ocr_candidate(source.mime_type)


def run_ocr(db: Session, source: InvestigationSource) -> InvestigationSource:
    """Lance l'OCR sur une source image : recupere le binaire depuis MinIO,
    reconnait le texte et persiste le resultat dans `extracted_text`. Le statut
    passe a `extracted` si du texte est trouve, sinon `none` (analyse infructueuse)."""
    try:
        content = storage_service.get_object(source.storage_key)
    except Exception:
        return source
    text = ocr_service.ocr_image(content)
    source.extracted_text = text
    source.text_status = (
        text_extraction_service.STATUS_EXTRACTED if text
        else text_extraction_service.STATUS_NONE
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def list_sources(db: Session, id_investigation: int) -> list[dict]:
    """Liste les sources d'une enquete, plus recentes d'abord. Les medias
    embarques d'une page (role=page_media) sont masques par defaut pour ne pas
    noyer la liste, sauf ceux explicitement promus (show_in_list).

    NB: on garde une source des que son role n'est PAS page_media. Le role est
    NULL pour toutes les sources classiques : il faut traiter ce NULL
    explicitement (en SQL `NULL = 'x'` vaut NULL, pas False), sinon un `NOT(...)`
    eliminerait toutes les lignes a role NULL."""
    visible = or_(
        InvestigationSource.role.is_(None),
        InvestigationSource.role != PAGE_MEDIA_ROLE,
        InvestigationSource.show_in_list.is_(True),
    )
    rows = (
        db.query(InvestigationSource, User.pseudo)
        .outerjoin(User, User.id_user == InvestigationSource.created_by)
        .filter(InvestigationSource.id_investigation == id_investigation)
        .filter(visible)
        .order_by(InvestigationSource.captured_at.desc())
        .all()
    )
    return [_to_dict(s, pseudo) for s, pseudo in rows]


def list_embedded_media(db: Session, parent: InvestigationSource) -> list[dict]:
    """Liste les medias embarques d'une archive HTML : les sources page_media
    partageant le meme capture_group que le parent. Vide si le parent n'a pas
    de groupe (capture sans media)."""
    if not parent.capture_group:
        return []
    rows = (
        db.query(InvestigationSource, User.pseudo)
        .outerjoin(User, User.id_user == InvestigationSource.created_by)
        .filter(InvestigationSource.id_investigation == parent.id_investigation)
        .filter(InvestigationSource.capture_group == parent.capture_group)
        .filter(InvestigationSource.role == PAGE_MEDIA_ROLE)
        .order_by(InvestigationSource.captured_at.asc())
        .all()
    )
    return [_to_dict(s, pseudo) for s, pseudo in rows]


def get_source(db: Session, id_source: int) -> Optional[InvestigationSource]:
    """Goal: fetch a source by id. Input: db, id_source. Output: InvestigationSource or None."""
    return db.query(InvestigationSource).filter(InvestigationSource.id_source == id_source).first()


def source_detail(db: Session, source: InvestigationSource) -> dict:
    """Goal: serialize a source with its creator's pseudo. Input: db, source. Output: source dict."""
    creator = (
        db.query(User.pseudo).filter(User.id_user == source.created_by).first()
        if source.created_by else None
    )
    return _to_dict(source, creator[0] if creator else None)


def get_content(source: InvestigationSource) -> bytes:
    """Recupere le binaire de la capture depuis MinIO."""
    return storage_service.get_object(source.storage_key)


def get_content_range(source: InvestigationSource, offset: int, length: int) -> bytes:
    """Recupere une plage d'octets du binaire (requetes HTTP Range : lecture et
    seek des medias video/audio compagnons depuis le viewer)."""
    return storage_service.get_object_range(source.storage_key, offset, length)


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
    """Goal: serialize a source to an API dict (incl. view signature). Input: source, author_pseudo. Output: dict."""
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
        "role": source.role,
        "show_in_list": source.show_in_list,
        "page_metadata": source.page_metadata,
        "notes": source.notes,
        "text_status": source.text_status,
        "extracted_text": source.extracted_text,
        "view_sig": view_signature(source),
        "captured_at": source.captured_at.isoformat() if source.captured_at else None,
        "created_at": source.created_at.isoformat() if source.created_at else None,
    }
