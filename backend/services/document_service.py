from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from models.document import Document
from models.document_comment import DocumentComment
from models.user import User
from utils.html_sanitize import sanitize_editor_html


def _now() -> datetime:
    return datetime.now(ZoneInfo("Europe/Paris"))


# Permissions
def can_write(permission: Optional[str]) -> bool:
    """owner / manager / editeur peuvent écrire ; lecteur lit seulement."""
    return permission in ("owner", "manager", "editeur")


def can_delete(permission: Optional[str], document: Document, user_id: int) -> bool:
    """L'owner de l'investigation ou le créateur du document peuvent supprimer."""
    return permission == "owner" or document.created_by == user_id


#  CRUD documents
def list_documents(db: Session, id_investigation: int) -> list[dict]:
    docs = (
        db.query(Document, User.pseudo)
        .outerjoin(User, User.id_user == Document.created_by)
        .filter(Document.id_investigation == id_investigation)
        .order_by(Document.updated_at.desc())
        .all()
    )
    return [
        {
            "id_document": d.id_document,
            "id_investigation": d.id_investigation,
            "title": d.title,
            "created_by": d.created_by,
            "created_by_pseudo": pseudo,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
        }
        for d, pseudo in docs
    ]


def get_document(db: Session, id_document: int) -> Optional[Document]:
    return db.query(Document).filter(Document.id_document == id_document).first()


def get_document_detail(db: Session, document: Document) -> dict:
    creator = (
        db.query(User.pseudo).filter(User.id_user == document.created_by).first()
        if document.created_by else None
    )
    return {
        "id_document": document.id_document,
        "id_investigation": document.id_investigation,
        "title": document.title,
        "content_html": document.content_html,
        "created_by": document.created_by,
        "created_by_pseudo": creator[0] if creator else None,
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "updated_at": document.updated_at.isoformat() if document.updated_at else None,
    }


def create_document(db: Session,id_investigation: int,title: str,content_html: str,created_by: int,) -> Document:
    document = Document(id_investigation=id_investigation, title=title,
                        content_html=sanitize_editor_html(content_html or ""), created_by=created_by,)
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def update_document(db: Session, document: Document, title: Optional[str], content_html: Optional[str],) -> Document:
    if title is not None:
        document.title = title

    if content_html is not None:
        document.content_html = sanitize_editor_html(content_html)

    document.updated_at = _now()
    db.commit()
    db.refresh(document)

    return document


def delete_document(db: Session, document: Document) -> None:
    db.delete(document)
    db.commit()


#  liste commentaire inline 
def list_comments(db: Session, id_document: int) -> list[dict]:
    rows = (db.query(DocumentComment, User.pseudo).outerjoin(User, User.id_user == DocumentComment.author_id).filter(DocumentComment.id_document == id_document).order_by(DocumentComment.created_at.asc()).all())
    return [
        {
            "id_comment": c.id_comment,
            "id_document": c.id_document,
            "comment_id": c.comment_id,
            "quote": c.quote,
            "content": c.content,
            "author_id": c.author_id,
            "author_pseudo": pseudo,
            "resolved": c.resolved,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c, pseudo in rows
    ]


def get_comment(db: Session, id_comment: int) -> Optional[DocumentComment]:
    return db.query(DocumentComment).filter(DocumentComment.id_comment == id_comment).first()


def create_comment(db: Session, id_document: int, comment_id: str, quote: str, content: str, author_id: int) -> DocumentComment:
    comment = DocumentComment(id_document=id_document, comment_id=comment_id, quote=quote or "", content=content, author_id=author_id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def toggle_resolved(db: Session, comment: DocumentComment) -> DocumentComment:
    comment.resolved = not comment.resolved
    db.commit()
    db.refresh(comment)
    return comment


def delete_comment(db: Session, comment: DocumentComment) -> None:
    db.delete(comment)
    db.commit()
