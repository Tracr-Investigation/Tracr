from typing import Optional

from sqlalchemy.orm import Session
from models.category import Category
from models.investigation_category import InvestigationCategory


def get_all_categories(db: Session) -> list[dict]:
    """Goal: list all categories (newest first). Input: db. Output: list of category dicts."""
    categories = (
        db.query(Category)
        .order_by(Category.created_at.desc())
        .all()
    )
    return [
        {
            "id_category": c.id_category,
            "name": c.name,
            "color": c.color,
            "icon": c.icon,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in categories
    ]


def get_category_by_id(db: Session, category_id: int) -> Optional[Category]:
    """Goal: fetch a category by id. Input: db, category_id. Output: Category or None."""
    return (
        db.query(Category)
        .filter(Category.id_category == category_id)
        .first()
    )


def create_category(
        db: Session, name: str, color: Optional[str] = None, icon: Optional[str] = None
) -> Category:
    """Goal: create a category. Input: db, name, color, icon. Output: the created Category."""
    category = Category(name=name, color=color, icon=icon)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(
        db: Session,
        category: Category,
        name: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None,
) -> Category:
    """Goal: update a category's name/color/icon. Input: db, category, name, color, icon. Output: the updated Category."""
    if name is not None:
        category.name = name
    if color is not None:
        category.color = color
    if icon is not None:
        category.icon = icon
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category: Category) -> None:
    """Goal: delete a category. Input: db, category. Output: None."""
    db.delete(category)
    db.commit()


def count_categories(db: Session) -> int:
    """Goal: count categories. Input: db. Output: int."""
    return db.query(Category).count()


def get_categories_for_investigation(db: Session, investigation_id: int) -> list[dict]:
    """Goal: list categories assigned to an investigation. Input: db, investigation_id. Output: list of category dicts."""
    rows = (
        db.query(Category)
        .join(InvestigationCategory, InvestigationCategory.id_category == Category.id_category)
        .filter(InvestigationCategory.id_investigation == investigation_id)
        .all()
    )
    return [
        {
            "id_category": c.id_category,
            "name": c.name,
            "color": c.color,
            "icon": c.icon,
        }
        for c in rows
    ]


def add_category_to_investigation(db: Session, investigation_id: int, category_id: int) -> dict:
    """Goal: assign a category to an investigation. Input: db, investigation_id, category_id. Output: the category dict."""
    link = InvestigationCategory(id_investigation=investigation_id, id_category=category_id)
    db.add(link)
    db.commit()
    db.refresh(link)
    category = get_category_by_id(db, category_id)
    return {
        "id_category": category.id_category,
        "name": category.name,
        "color": category.color,
        "icon": category.icon,
    }


def remove_category_from_investigation(db: Session, investigation_id: int, category_id: int) -> bool:
    """Goal: unassign a category from an investigation. Input: db, investigation_id, category_id. Output: bool (False if not linked)."""
    link = (
        db.query(InvestigationCategory)
        .filter(
            InvestigationCategory.id_investigation == investigation_id,
            InvestigationCategory.id_category == category_id,
        )
        .first()
    )
    if not link:
        return False
    db.delete(link)
    db.commit()
    return True
