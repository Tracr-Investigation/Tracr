from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy import or_
from sqlalchemy.orm import Session

from models.template import Template
from models.user import User
from utils.html_sanitize import sanitize_editor_html


def _now() -> datetime:
    return datetime.now(ZoneInfo("Europe/Paris"))


def can_modify(template: Template, user_id: int) -> bool:
    """Seul le créateur peut modifier ou supprimer son template."""
    return template.created_by == user_id


# CRUD 
def list_templates(db: Session, user_id: int) -> list[dict]:
    """Templates visibles : ceux de l'utilisateur OU publics."""
    rows = (
        db.query(Template, User.pseudo)
        .outerjoin(User, User.id_user == Template.created_by)
        .filter(or_(Template.created_by == user_id, Template.is_public.is_(True)))
        .order_by(Template.updated_at.desc())
        .all()
    )
    return [
        {
            "id_template": t.id_template,
            "name": t.name,
            "description": t.description,
            "is_public": t.is_public,
            "created_by": t.created_by,
            "created_by_pseudo": pseudo,
            "is_owner": t.created_by == user_id,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        }
        for t, pseudo in rows
    ]


def get_template(db: Session, id_template: int) -> Optional[Template]:
    return db.query(Template).filter(Template.id_template == id_template).first()


def get_template_detail(db: Session, id_template: int, user_id: int) -> Optional[dict]:
    row = (
        db.query(Template, User.pseudo)
        .outerjoin(User, User.id_user == Template.created_by)
        .filter(Template.id_template == id_template)
        .first()
    )
    if row is None:
        return None
    t, pseudo = row
    return {
        "id_template": t.id_template,
        "name": t.name,
        "description": t.description,
        "content_html": t.content_html,
        "is_public": t.is_public,
        "created_by": t.created_by,
        "created_by_pseudo": pseudo,
        "is_owner": t.created_by == user_id,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def create_template(db: Session, name: str, description: str, content_html: str, is_public: bool, created_by: int) -> Template:
    template = Template(name=name, description=description or "", content_html=sanitize_editor_html(content_html or ""), is_public=is_public, created_by=created_by)
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def update_template(db: Session,template: Template,name: Optional[str],description: Optional[str],content_html: Optional[str],is_public: Optional[bool]) -> Template:
    if name is not None:
        template.name = name.strip()

    if description is not None:
        template.description = description

    if content_html is not None:
        template.content_html = sanitize_editor_html(content_html)

    if is_public is not None:
        template.is_public = is_public
        
    template.updated_at = _now()
    db.commit()
    db.refresh(template)
    return template


def delete_template(db: Session, template: Template) -> None:
    db.delete(template)
    db.commit()


def can_view(template: Template, user_id: int) -> bool:
    """Visible si l'utilisateur est le créateur ou si le template est public."""
    return template.is_public or template.created_by == user_id
