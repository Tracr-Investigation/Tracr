"""hit_service.py -- confrontation des selecteurs au texte des sources.

Pour une enquete, on charge ses selecteurs et le texte extrait de ses sources,
puis on cherche chaque `normalized_value` dans le texte pour produire des "hits".

Deux strategies de recherche selon le type de selecteur :
  - alphanumerique (telephone, IBAN, IMEI, plaque...) : on compare des chaines
    reduites aux seuls caracteres alphanumeriques, des deux cotes, pour absorber
    les separateurs (« 06 12 34 » == « 0612 34 »).
  - textuel (email, pseudo, domaine, mot-cle...) : recherche insensible a la casse
    dans le texte normalise.
"""
import re
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from models.selector import InvestigationSelector
from models.selector_hit import SelectorHit
from models.source import InvestigationSource
from models.user import User
from services import selector_service, source_service, text_extraction_service

# Types compares sur leur forme alphanumerique (separateurs ignores).
_ALNUM_TYPES = frozenset({
    "phone", "imei", "iban", "credit_card", "national_id", "license_plate", "mac_address",
})

# Longueur minimale du motif pour eviter les faux positifs sur des valeurs trop courtes.
_MIN_LEN_TEXT = 3
_MIN_LEN_ALNUM = 4

_SNIPPET_RADIUS = 60


def _alnum(s: str) -> str:
    return re.sub(r"[^0-9a-z]", "", s.lower())


def _build_haystacks(text: str) -> tuple[str, str]:
    """(texte minuscule a espaces normalises, texte reduit a l'alphanumerique)."""
    lower = re.sub(r"\s+", " ", text.lower())
    return lower, _alnum(text)


def _snippet(original_lower: str, original: str, needle: str) -> Optional[str]:
    idx = original_lower.find(needle)
    if idx < 0:
        return None
    start = max(0, idx - _SNIPPET_RADIUS)
    end = min(len(original), idx + len(needle) + _SNIPPET_RADIUS)
    snippet = original[start:end].replace("\n", " ").strip()
    return ("…" if start > 0 else "") + snippet + ("…" if end < len(original) else "")


def _match_in_source(
    selector: InvestigationSelector,
    lower: str,
    alnum: str,
    original: str,
) -> Optional[dict]:
    """Retourne {occurrences, snippet} si le selecteur apparait, sinon None."""
    if selector.selector_type in _ALNUM_TYPES:
        needle = _alnum(selector.normalized_value)
        if len(needle) < _MIN_LEN_ALNUM:
            return None
        occ = alnum.count(needle)
        if occ == 0:
            return None
        return {"occurrences": occ, "snippet": None}

    needle = selector.normalized_value.lower()
    if len(needle) < _MIN_LEN_TEXT:
        return None
    occ = lower.count(needle)
    if occ == 0:
        return None
    return {"occurrences": occ, "snippet": _snippet(lower, original, needle)}


def compute_hits(db: Session, investigation_id: int) -> dict:
    """Scanne les sources de l'enquete et retourne les hits groupes par selecteur.

    Effet de bord : declenche l'extraction paresseuse du texte des sources encore
    non analysees (`unprocessed`).
    """
    selectors = (
        db.query(InvestigationSelector)
        .filter(InvestigationSelector.id_investigation == investigation_id)
        .order_by(InvestigationSelector.created_at.desc())
        .all()
    )
    sources = (
        db.query(InvestigationSource)
        .filter(InvestigationSource.id_investigation == investigation_id)
        .all()
    )

    # Backfill paresseux + pre-calcul des haystacks pour les sources avec texte.
    analyzable: list[tuple[InvestigationSource, str, str]] = []
    pending_ocr = 0
    for source in sources:
        source = source_service.ensure_extracted_text(db, source)
        if source.text_status == text_extraction_service.STATUS_PENDING_OCR:
            pending_ocr += 1
        if source.extracted_text:
            lower, alnum = _build_haystacks(source.extracted_text)
            analyzable.append((source, lower, alnum))

    results = []
    persist_rows: list[tuple[int, int, int, Optional[str]]] = []  # (selector, source, occ, snippet)
    for selector in selectors:
        matched_sources = []
        total = 0
        for source, lower, alnum in analyzable:
            hit = _match_in_source(selector, lower, alnum, source.extracted_text or "")
            if hit:
                total += hit["occurrences"]
                persist_rows.append((selector.id_selector, source.id_source, hit["occurrences"], hit["snippet"]))
                matched_sources.append({
                    "id_source": source.id_source,
                    "title": source.title,
                    "source_type": source.source_type,
                    "source_url": source.source_url,
                    "occurrences": hit["occurrences"],
                    "snippet": hit["snippet"],
                })
        results.append({
            "selector": selector_service.selector_detail(db, selector),
            "hit_count": total,
            "source_count": len(matched_sources),
            "sources": matched_sources,
        })

    # Persistance : on remplace integralement les hits de l'enquete par ce scan.
    db.query(SelectorHit).filter(SelectorHit.id_investigation == investigation_id).delete()
    now = datetime.now(ZoneInfo("Europe/Paris"))
    for id_selector, id_source, occ, snippet in persist_rows:
        db.add(SelectorHit(
            id_investigation=investigation_id, id_selector=id_selector, id_source=id_source,
            occurrences=occ, snippet=snippet, computed_at=now,
        ))
    db.commit()

    # Selecteurs avec des hits d'abord, puis tri par volume decroissant.
    results.sort(key=lambda r: (r["source_count"], r["hit_count"]), reverse=True)

    return {
        "total_sources": len(sources),
        "analyzed_sources": len(analyzable),
        "pending_ocr_sources": pending_ocr,
        "selector_count": len(selectors),
        "computed_at": now.isoformat(),
        "stale": False,
        "hits": results,
    }


def get_stored_hits(db: Session, investigation_id: int) -> dict:
    """Renvoie les hits DEJA enregistres (dernier scan), sans recalcul ni
    extraction. Permet d'afficher les correspondances + la date de derniere
    analyse instantanement, et de signaler si l'analyse est potentiellement
    perimee (sources/selecteurs modifies depuis)."""
    selectors = (
        db.query(InvestigationSelector)
        .filter(InvestigationSelector.id_investigation == investigation_id)
        .order_by(InvestigationSelector.created_at.desc())
        .all()
    )
    rows = (
        db.query(SelectorHit, InvestigationSource.title, InvestigationSource.source_type,
                 InvestigationSource.source_url)
        .join(InvestigationSource, InvestigationSource.id_source == SelectorHit.id_source)
        .filter(SelectorHit.id_investigation == investigation_id)
        .all()
    )

    by_selector: dict[int, list] = {}
    last_computed = None
    for hit, title, stype, surl in rows:
        by_selector.setdefault(hit.id_selector, []).append({
            "id_source": hit.id_source,
            "title": title,
            "source_type": stype,
            "source_url": surl,
            "occurrences": hit.occurrences,
            "snippet": hit.snippet,
        })
        if last_computed is None or hit.computed_at > last_computed:
            last_computed = hit.computed_at

    results = []
    for selector in selectors:
        srcs = by_selector.get(selector.id_selector, [])
        results.append({
            "selector": selector_service.selector_detail(db, selector),
            "hit_count": sum(s["occurrences"] for s in srcs),
            "source_count": len(srcs),
            "sources": srcs,
        })
    results.sort(key=lambda r: (r["source_count"], r["hit_count"]), reverse=True)

    total_sources = (
        db.query(InvestigationSource)
        .filter(InvestigationSource.id_investigation == investigation_id)
        .count()
    )
    return {
        "total_sources": total_sources,
        "analyzed_sources": None,
        "pending_ocr_sources": None,
        "selector_count": len(selectors),
        "computed_at": last_computed.isoformat() if last_computed else None,
        "hits": results,
    }


def _source_hit_payload(selector: InvestigationSelector, occurrences: int, snippet: Optional[str], pseudo: Optional[str]) -> dict:
    return {
        "selector": selector_service._to_dict(selector, pseudo),
        "occurrences": occurrences,
        "snippet": snippet,
    }


def compute_hits_for_source(db: Session, source: InvestigationSource) -> dict:
    """Analyse UNE source contre tous les selecteurs de son enquete, persiste le
    resultat (remplace les hits de cette source) et le renvoie."""
    source = source_service.ensure_extracted_text(db, source)
    selectors = (
        db.query(InvestigationSelector, User.pseudo)
        .outerjoin(User, User.id_user == InvestigationSelector.created_by)
        .filter(InvestigationSelector.id_investigation == source.id_investigation)
        .order_by(InvestigationSelector.created_at.desc())
        .all()
    )

    hits = []
    now = datetime.now(ZoneInfo("Europe/Paris"))
    db.query(SelectorHit).filter(SelectorHit.id_source == source.id_source).delete()

    if source.extracted_text:
        lower, alnum = _build_haystacks(source.extracted_text)
        for selector, pseudo in selectors:
            match = _match_in_source(selector, lower, alnum, source.extracted_text)
            if match:
                db.add(SelectorHit(
                    id_investigation=source.id_investigation, id_selector=selector.id_selector,
                    id_source=source.id_source, occurrences=match["occurrences"],
                    snippet=match["snippet"], computed_at=now,
                ))
                hits.append(_source_hit_payload(selector, match["occurrences"], match["snippet"], pseudo))
    db.commit()

    hits.sort(key=lambda h: h["occurrences"], reverse=True)
    return {
        "id_source": source.id_source,
        "title": source.title,
        "text_status": source.text_status,
        "analyzed": bool(source.extracted_text),
        "selector_count": len(selectors),
        "hits": hits,
    }


def get_source_hits(db: Session, source: InvestigationSource) -> dict:
    """Renvoie les hits DEJA enregistres pour une source (sans recalcul)."""
    rows = (
        db.query(SelectorHit, InvestigationSelector, User.pseudo)
        .join(InvestigationSelector, InvestigationSelector.id_selector == SelectorHit.id_selector)
        .outerjoin(User, User.id_user == InvestigationSelector.created_by)
        .filter(SelectorHit.id_source == source.id_source)
        .order_by(SelectorHit.occurrences.desc())
        .all()
    )
    hits = [_source_hit_payload(sel, h.occurrences, h.snippet, pseudo) for h, sel, pseudo in rows]
    computed_at = rows[0][0].computed_at.isoformat() if rows else None
    return {
        "id_source": source.id_source,
        "title": source.title,
        "text_status": source.text_status,
        "analyzed": source.text_status == text_extraction_service.STATUS_EXTRACTED,
        "computed_at": computed_at,
        "hits": hits,
    }
