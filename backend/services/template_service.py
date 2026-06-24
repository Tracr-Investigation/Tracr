from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy import or_
from sqlalchemy.orm import Session

from models.template import Template
from models.template_category import TemplateCategory
from models.user import User
from utils.html_sanitize import sanitize_editor_html


def _now() -> datetime:
    """Goal: current Europe/Paris datetime. Input: none. Output: datetime."""
    return datetime.now(ZoneInfo("Europe/Paris"))


def can_modify(template: Template, user_id: int) -> bool:
    """Goal: tell if a user may modify a template (its creator only). Input: template, user_id. Output: bool."""
    return template.created_by == user_id


def can_view(template: Template, user_id: int) -> bool:
    """Goal: tell if a user may view a template (public or own). Input: template, user_id. Output: bool."""
    return template.is_public or template.created_by == user_id


# ── Template category CRUD ───────────────────────────────────────────────────

def list_template_categories(db: Session) -> list[dict]:
    """Goal: list all template categories (alphabetical). Input: db. Output: list of category dicts."""
    rows = db.query(TemplateCategory).order_by(TemplateCategory.name).all()
    return [_category_to_dict(c) for c in rows]


def get_template_category(db: Session, id_category_template: int) -> Optional[TemplateCategory]:
    """Goal: fetch a template category by id. Input: db, id_category_template. Output: TemplateCategory or None."""
    return db.query(TemplateCategory).filter(
        TemplateCategory.id_category_template == id_category_template
    ).first()


def create_template_category(db: Session, name: str, color: Optional[str], icon: Optional[str]) -> TemplateCategory:
    """Goal: create a template category. Input: db, name, color, icon. Output: the created TemplateCategory."""
    cat = TemplateCategory(name=name.strip(), color=color, icon=icon)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def update_template_category(
    db: Session,
    cat: TemplateCategory,
    name: Optional[str],
    color: Optional[str],
    icon: Optional[str],
) -> TemplateCategory:
    """Goal: update a template category's name/color/icon. Input: db, cat, name, color, icon. Output: the updated TemplateCategory."""
    if name is not None:
        cat.name = name.strip()
    if color is not None:
        cat.color = color
    if icon is not None:
        cat.icon = icon
    db.commit()
    db.refresh(cat)
    return cat


def delete_template_category(db: Session, cat: TemplateCategory) -> None:
    """Goal: delete a template category. Input: db, cat. Output: None."""
    db.delete(cat)
    db.commit()


def _category_to_dict(c: TemplateCategory) -> dict:
    """Goal: serialize a template category to a dict. Input: c. Output: dict."""
    return {
        "id_category_template": c.id_category_template,
        "name": c.name,
        "color": c.color,
        "icon": c.icon,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


# ── Template CRUD ────────────────────────────────────────────────────────────

def _template_to_dict(t: Template, pseudo: Optional[str], user_id: int, category: Optional[TemplateCategory]) -> dict:
    """Goal: serialize a template to a dict (without content_html). Input: t, pseudo, user_id, category. Output: dict."""
    return {
        "id_template": t.id_template,
        "name": t.name,
        "description": t.description,
        "is_public": t.is_public,
        "created_by": t.created_by,
        "created_by_pseudo": pseudo,
        "is_owner": t.created_by == user_id,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        "category": _category_to_dict(category) if category else None,
    }


def list_templates(db: Session, user_id: int) -> list[dict]:
    """Goal: list templates visible to a user (own + public, newest first). Input: db, user_id. Output: list of template dicts."""
    rows = (
        db.query(Template, User.pseudo, TemplateCategory)
        .outerjoin(User, User.id_user == Template.created_by)
        .outerjoin(TemplateCategory, TemplateCategory.id_category_template == Template.id_category_template)
        .filter(or_(Template.created_by == user_id, Template.is_public.is_(True)))
        .order_by(Template.updated_at.desc())
        .all()
    )
    return [_template_to_dict(t, pseudo, user_id, cat) for t, pseudo, cat in rows]


def get_template(db: Session, id_template: int) -> Optional[Template]:
    """Goal: fetch a template by id. Input: db, id_template. Output: Template or None."""
    return db.query(Template).filter(Template.id_template == id_template).first()


def get_template_detail(db: Session, id_template: int, user_id: int) -> Optional[dict]:
    """Goal: serialize a template with its content_html and author. Input: db, id_template, user_id. Output: template dict or None."""
    row = (
        db.query(Template, User.pseudo, TemplateCategory)
        .outerjoin(User, User.id_user == Template.created_by)
        .outerjoin(TemplateCategory, TemplateCategory.id_category_template == Template.id_category_template)
        .filter(Template.id_template == id_template)
        .first()
    )
    if row is None:
        return None
    t, pseudo, cat = row
    return {**_template_to_dict(t, pseudo, user_id, cat), "content_html": t.content_html}


def create_template(
    db: Session,
    name: str,
    description: str,
    content_html: str,
    is_public: bool,
    created_by: int,
    id_category_template: Optional[int] = None,
) -> Template:
    """Goal: create a template (sanitizes the HTML). Input: db, name, description, content_html, is_public, created_by, id_category_template. Output: the created Template."""
    template = Template(
        name=name,
        description=description or "",
        content_html=sanitize_editor_html(content_html or ""),
        is_public=is_public,
        created_by=created_by,
        id_category_template=id_category_template,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def update_template(
    db: Session,
    template: Template,
    name: Optional[str],
    description: Optional[str],
    content_html: Optional[str],
    is_public: Optional[bool],
    id_category_template: Optional[int] = None,
    clear_category: bool = False,
) -> Template:
    """Goal: update a template's fields (sanitizes HTML, can clear category). Input: db, template, name, description, content_html, is_public, id_category_template, clear_category. Output: the updated Template."""
    if name is not None:
        template.name = name.strip()
    if description is not None:
        template.description = description
    if content_html is not None:
        template.content_html = sanitize_editor_html(content_html)
    if is_public is not None:
        template.is_public = is_public
    if clear_category:
        template.id_category_template = None
    elif id_category_template is not None:
        template.id_category_template = id_category_template
    template.updated_at = _now()
    db.commit()
    db.refresh(template)
    return template


def delete_template(db: Session, template: Template) -> None:
    """Goal: delete a template. Input: db, template. Output: None."""
    db.delete(template)
    db.commit()
