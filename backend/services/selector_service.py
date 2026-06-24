"""selector_service.py -- logique metier des selecteurs OSINT d'une enquete.

Un "selecteur" est un identifiant recherche (email, telephone, pseudo, domaine,
wallet crypto...) que l'on confronte au texte extrait des sources archivees pour
detecter des correspondances ("hits"). Memes regles de permission que les sources.
"""
import re
from typing import Optional

from sqlalchemy.orm import Session

from models.selector import InvestigationSelector
from models.user import User

# Types de selecteurs supportes. `autre` = fourre-tout pour tout identifiant
# ne rentrant pas dans une categorie dediee (mot-cle libre, reference, etc.).
SELECTOR_TYPES: dict[str, str] = {
    "email": "Adresse e-mail",
    "phone": "Telephone",
    "username": "Pseudo / identifiant",
    "full_name": "Nom complet",
    "domain": "Nom de domaine",
    "url": "URL",
    "ip_address": "Adresse IP",
    "mac_address": "Adresse MAC",
    "imei": "IMEI",
    "crypto_wallet": "Portefeuille crypto",
    "iban": "IBAN / compte bancaire",
    "credit_card": "Carte bancaire",
    "national_id": "Piece d'identite (CNI, passeport...)",
    "license_plate": "Plaque d'immatriculation",
    "address": "Adresse postale",
    "company": "Societe (SIREN/SIRET...)",
    "social_profile": "Profil reseau social",
    "keyword": "Mot-cle",
    "autre": "Autre",
}


def is_valid_type(selector_type: str) -> bool:
    """Goal: check a selector type is supported. Input: selector_type. Output: bool."""
    return selector_type in SELECTOR_TYPES


def normalize(selector_type: str, value: str) -> str:
    """Forme canonique pour le matching, dependante du type.

    - email / domain / url / username / social_profile : minuscules, @ initial retire
    - phone / imei / iban / credit_card / national_id / license_plate : caracteres
      alphanumeriques uniquement (on garde un + initial pour le telephone)
    - mac_address : hexa minuscule sans separateur
    - autres : minuscules, espaces normalises
    """
    v = (value or "").strip()
    if not v:
        return ""

    if selector_type in ("email", "domain", "url"):
        return v.lower()
    if selector_type in ("username", "social_profile"):
        return v.lstrip("@").lower()
    if selector_type == "phone":
        digits = re.sub(r"[^0-9+]", "", v)
        # un seul + autorise, en tete
        plus = digits.startswith("+")
        digits = digits.replace("+", "")
        return ("+" + digits) if plus else digits
    if selector_type in ("imei", "iban", "credit_card", "national_id", "license_plate"):
        return re.sub(r"[^0-9a-z]", "", v.lower())
    if selector_type == "mac_address":
        return re.sub(r"[^0-9a-f]", "", v.lower())
    # full_name, address, company, keyword, autre, ip_address...
    return re.sub(r"\s+", " ", v.lower())


# Permissions : memes regles que les sources / documents.
def can_write(permission: Optional[str]) -> bool:
    """Goal: tell if a permission level may add/edit selectors. Input: permission. Output: bool."""
    return permission in ("owner", "manager", "editeur")


def can_delete(permission: Optional[str], selector: InvestigationSelector, user_id: int) -> bool:
    """Goal: tell if a user may delete a selector (owner or its creator). Input: permission, selector, user_id. Output: bool."""
    return permission == "owner" or selector.created_by == user_id


def create_selector(
    db: Session,
    *,
    id_investigation: int,
    created_by: int,
    selector_type: str,
    value: str,
    label: Optional[str] = None,
    notes: Optional[str] = None,
) -> InvestigationSelector:
    """Goal: create a selector (stores raw + normalized value). Input: db, id_investigation, created_by, selector_type, value, label, notes. Output: the created InvestigationSelector."""
    selector = InvestigationSelector(
        id_investigation=id_investigation,
        created_by=created_by,
        selector_type=selector_type,
        value=value.strip(),
        normalized_value=normalize(selector_type, value),
        label=(label.strip() if label else None) or None,
        notes=(notes.strip() if notes else None) or None,
    )
    db.add(selector)
    db.commit()
    db.refresh(selector)
    return selector


def get_selector(db: Session, id_selector: int) -> Optional[InvestigationSelector]:
    """Goal: fetch a selector by id. Input: db, id_selector. Output: InvestigationSelector or None."""
    return (
        db.query(InvestigationSelector)
        .filter(InvestigationSelector.id_selector == id_selector)
        .first()
    )


def find_duplicate(
    db: Session, id_investigation: int, selector_type: str, normalized_value: str
) -> Optional[InvestigationSelector]:
    """Goal: find an existing selector with the same type/normalized value. Input: db, id_investigation, selector_type, normalized_value. Output: InvestigationSelector or None."""
    return (
        db.query(InvestigationSelector)
        .filter(
            InvestigationSelector.id_investigation == id_investigation,
            InvestigationSelector.selector_type == selector_type,
            InvestigationSelector.normalized_value == normalized_value,
        )
        .first()
    )


def list_selectors(db: Session, id_investigation: int) -> list[dict]:
    """Goal: list an investigation's selectors (newest first, with author). Input: db, id_investigation. Output: list of selector dicts."""
    rows = (
        db.query(InvestigationSelector, User.pseudo)
        .outerjoin(User, User.id_user == InvestigationSelector.created_by)
        .filter(InvestigationSelector.id_investigation == id_investigation)
        .order_by(InvestigationSelector.created_at.desc())
        .all()
    )
    return [_to_dict(s, pseudo) for s, pseudo in rows]


def update_selector(
    db: Session,
    selector: InvestigationSelector,
    *,
    value: Optional[str] = None,
    selector_type: Optional[str] = None,
    label: Optional[str] = None,
    notes: Optional[str] = None,
) -> InvestigationSelector:
    """Goal: update a selector's fields (re-normalizes value if changed). Input: db, selector, value, selector_type, label, notes. Output: the updated InvestigationSelector."""
    if selector_type is not None:
        selector.selector_type = selector_type
    if value is not None:
        selector.value = value.strip()
    if value is not None or selector_type is not None:
        selector.normalized_value = normalize(selector.selector_type, selector.value)
    if label is not None:
        selector.label = label.strip() or None
    if notes is not None:
        selector.notes = notes.strip() or None
    db.add(selector)
    db.commit()
    db.refresh(selector)
    return selector


def delete_selector(db: Session, selector: InvestigationSelector) -> None:
    """Goal: delete a selector. Input: db, selector. Output: None."""
    db.delete(selector)
    db.commit()


def selector_detail(db: Session, selector: InvestigationSelector) -> dict:
    """Goal: serialize a selector with its creator's pseudo. Input: db, selector. Output: selector dict."""
    creator = (
        db.query(User.pseudo).filter(User.id_user == selector.created_by).first()
        if selector.created_by else None
    )
    return _to_dict(selector, creator[0] if creator else None)


def _to_dict(selector: InvestigationSelector, author_pseudo: Optional[str]) -> dict:
    """Goal: serialize a selector to an API dict. Input: selector, author_pseudo. Output: dict."""
    return {
        "id_selector": selector.id_selector,
        "id_investigation": selector.id_investigation,
        "created_by": selector.created_by,
        "created_by_pseudo": author_pseudo,
        "selector_type": selector.selector_type,
        "selector_type_label": SELECTOR_TYPES.get(selector.selector_type, selector.selector_type),
        "value": selector.value,
        "normalized_value": selector.normalized_value,
        "label": selector.label,
        "notes": selector.notes,
        "created_at": selector.created_at.isoformat() if selector.created_at else None,
    }
