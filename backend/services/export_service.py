"""Export d'un document HTML en PDF (WeasyPrint).

Le PDF comporte (dans l'ordre) :
  1. une page de couverture pleine page (image de l'enquete ou couverture par defaut) ;
  2. un sommaire genere a partir des titres h1/h2/h3, avec numeros de page ;
  3. le contenu du document, avec un marquage TLP/PAP repete en pied de chaque page.
"""
import re
import base64
from datetime import datetime
from typing import Optional, Tuple
from zoneinfo import ZoneInfo

import requests as http_requests

from models.document import Document
from utils.html_sanitize import sanitize_editor_html


# Couleurs officielles TLP (vives, pour la pastille sur fond noir de la couverture).
_MARK_COLORS = {
    "RED": "#FF2B2B",
    "AMBER": "#FFC000",
    "AMBER+STRICT": "#FFC000",
    "GREEN": "#33FF00",
    "CLEAR": "#FFFFFF",
}

# Variantes assombries, lisibles en texte sur fond blanc (pied de page).
_FOOTER_COLORS = {
    "RED": "#b91c1c",
    "AMBER": "#b45309",
    "AMBER+STRICT": "#b45309",
    "GREEN": "#15803d",
    "CLEAR": "#374151",
}


def _marking_meta(protocol: Optional[str], level: Optional[str]) -> Optional[Tuple[str, str, str]]:
    """Retourne (texte, couleur_vive, couleur_pied) du marquage, ou None si invalide."""
    if not protocol or not level:
        return None
    proto = protocol.strip().upper()
    lvl = level.strip().upper()
    if proto not in ("TLP", "PAP"):
        return None
    color = _MARK_COLORS.get(lvl)
    if not color:
        return None
    return f"{proto}:{lvl}", color, _FOOTER_COLORS.get(lvl, "#374151")


def _escape(s: str) -> str:
    """Goal: HTML-escape a string for safe insertion. Input: s. Output: escaped str."""
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# Extension -> type MIME pour reconstruire un data URI de couverture.
_COVER_EXT_MIME = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "gif": "image/gif",
}


def _default_cover_data_uri() -> str:
    """Couverture par defaut (SVG embarque) : fond clair + accents ambre."""
    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' width='210' height='297' "
        "viewBox='0 0 210 297'>"
        "<rect width='210' height='297' fill='#fafaf9'/>"
        "<polygon points='0,297 210,170 210,297' fill='#f1efe9'/>"
        "<polygon points='0,297 140,297 0,205' fill='#fdf4e3'/>"
        "<g stroke='#f59e0b' stroke-width='0.4' opacity='0.6'>"
        "<line x1='150' y1='40' x2='200' y2='40'/>"
        "<line x1='170' y1='52' x2='200' y2='52'/>"
        "</g>"
        "<rect x='0' y='0' width='210' height='4' fill='#f59e0b'/>"
        "<circle cx='178' cy='40' r='2.2' fill='#f59e0b'/>"
        "</svg>"
    )
    b64 = base64.b64encode(svg.encode("utf-8")).decode()
    return f"data:image/svg+xml;base64,{b64}"


def _cover_data_uri(document: Document, db) -> str:
    """Renvoie le data URI de la couverture : image de l'enquete si definie,
    sinon la couverture par defaut."""
    if db is None:
        return _default_cover_data_uri()
    try:
        from services import investigation_service, storage_service
        inv = investigation_service.get_investigation_by_id(db, document.id_investigation)
        if inv and inv.cover_storage_key:
            data = storage_service.get_object(inv.cover_storage_key)
            ext = inv.cover_storage_key.rsplit(".", 1)[-1].lower()
            mime = _COVER_EXT_MIME.get(ext, "image/png")
            b64 = base64.b64encode(data).decode()
            return f"data:{mime};base64,{b64}"
    except Exception:
        pass
    return _default_cover_data_uri()


_HEADING_RE = re.compile(r"<(h[1-3])\b([^>]*)>(.*?)</\1>", re.IGNORECASE | re.DOTALL)
_TAG_RE = re.compile(r"<[^>]+>")


def _build_toc(content_html: str) -> Tuple[str, str]:
    """Genere le sommaire et reinjecte des ancres `id` dans les titres du contenu.

    Retourne (toc_html, content_html_ancre). toc_html est vide s'il n'y a aucun titre.
    """
    entries = []  # (level, anchor_id, number, label)
    counters = [0, 0, 0]
    seq = 0

    def _number(level: int) -> str:
        counters[level - 1] += 1
        for i in range(level, 3):
            counters[i] = 0
        return ".".join(str(counters[i]) for i in range(level))

    def _replace(match: re.Match) -> str:
        nonlocal seq
        seq += 1
        tag, attrs, inner = match.group(1), match.group(2), match.group(3)
        level = int(tag[1])
        anchor = f"sec-{seq}"
        label = _TAG_RE.sub("", inner).strip()
        if label:
            entries.append((level, anchor, _number(level), label))
        return f'<{tag} id="{anchor}"{attrs}>{inner}</{tag}>'

    anchored = _HEADING_RE.sub(_replace, content_html or "")

    if not entries:
        return "", anchored

    items = []
    for level, anchor, number, label in entries:
        items.append(
            f'<div class="toc-item toc-l{level}">'
            f'<a href="#{anchor}">{number}. {label}</a></div>'
        )
    toc_html = (
        '<section class="toc">'
        '<h2 class="toc-title">Sommaire</h2>'
        + "".join(items)
        + "</section>"
    )
    return toc_html, anchored


def _objectives_section(objectives: Optional[str]) -> str:
    """Bloc « Objectifs de l'enquete » insere juste apres le sommaire.

    Le texte est libre (saisie utilisateur) : on l'echappe et on convertit les
    sauts de ligne en <br>. Vide si aucun objectif n'est renseigne.
    """
    text = (objectives or "").strip()
    if not text:
        return ""
    body = "<br>".join(_escape(line) for line in text.split("\n"))
    return (
        '<section class="objectives">'
        '<h2 class="objectives-title">Objectifs de l\'enquête</h2>'
        f'<div class="objectives-body">{body}</div>'
        "</section>"
    )


def _wrap_html(
    title: str,
    investigation_title: str,
    content_html: str,
    toc_html: str,
    objectives_html: str,
    cover_uri: str,
    markings: list,
) -> str:
    """Enveloppe le contenu dans un HTML print-ready (couverture + sommaire + contenu).

    `markings` est une liste de triplets (texte, couleur_vive, couleur_pied) - 0, 1
    ou 2 elements (TLP et/ou PAP).

    `content_html` doit DEJA etre assaini ET porter les ancres `id` des titres
    (cf. render_pdf) : on ne le re-nettoie pas ici, sinon nh3 retirerait les `id`
    et casserait les liens du sommaire.
    """
    date_str = datetime.now(ZoneInfo("Europe/Paris")).strftime("%d/%m/%Y")

    # Marquages repetes en pied de chaque page (hors couverture, dont le @page a
    # margin:0). Texte gras colore SANS fond : une boite de marge avec background
    # remplit toute la hauteur de la marge basse (gros bloc disgracieux).
    # Deux marquages -> un a gauche, l'autre au centre (chacun sa couleur, ce qu'un
    # seul @bottom-center ne permet pas car son `content` n'a qu'une couleur).
    def _box(pos: str, m) -> str:
        return (
            f'@bottom-{pos} {{ content: "{m[0]}"; color: {m[2]}; '
            "font-weight: bold; font-size: 8pt; letter-spacing: 0.5px; }"
        )

    if len(markings) >= 2:
        footer_box = _box("left", markings[0]) + " " + _box("center", markings[1])
    elif len(markings) == 1:
        footer_box = _box("center", markings[0])
    else:
        footer_box = ""

    cover_badge = "".join(
        f'<div class="cover-mark" style="color: {m[1]};">{m[0]}</div>' for m in markings
    )

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>{_escape(title)}</title>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
            @bottom-right {{
                content: counter(page) " / " counter(pages);
                font-size: 9pt;
                color: #666;
            }}
            {footer_box}
        }}
        @page cover {{
            margin: 0;
            /* Les boites de marge de la regle @page de base (numero de page + marquage)
               s'appliquent aussi a la couverture : on les neutralise pour ne pas les
               voir deborder par-dessus le design pleine page. */
            @bottom-right {{ content: none; }}
            @bottom-center {{ content: none; }}
            @bottom-left {{ content: none; }}
        }}
        body {{
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #1a1a1a;
        }}
        h1 {{ font-size: 22pt; margin-top: 0; }}
        h2 {{ font-size: 16pt; margin-top: 1em; }}
        h3 {{ font-size: 13pt; margin-top: 0.8em; }}
        h4 {{ font-size: 11pt; margin-top: 0.6em; }}
        p {{ margin: 0.5em 0; }}
        a {{ color: #2563eb; }}
        blockquote {{
            border-left: 3px solid #f59e0b;
            padding-left: 1em;
            margin-left: 0;
            color: #555;
            font-style: italic;
        }}
        code {{
            background: #f3f4f6;
            border-radius: 3px;
            padding: 0.1em 0.3em;
            font-family: 'DejaVu Sans Mono', monospace;
            font-size: 0.9em;
        }}
        pre {{
            background: #f3f4f6;
            border-radius: 4px;
            padding: 0.75em;
            overflow-x: auto;
            font-family: 'DejaVu Sans Mono', monospace;
            font-size: 0.9em;
        }}
        pre code {{ background: transparent; padding: 0; }}
        img {{ max-width: 100%; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 6px 10px; }}
        ul, ol {{ padding-left: 1.5em; }}
        ul[data-type="taskList"] {{ list-style: none; padding-left: 0; }}
        ul[data-type="taskList"] li {{ display: flex; gap: 0.5em; }}
        span[data-comment-id] {{ background: rgba(255, 220, 0, 0.15); }}
        span[data-comment-id][data-resolved="true"] {{ background: transparent; }}
        h1.doc-title {{ border-bottom: 2px solid #ddd; padding-bottom: 0.3em; }}

        /* Page de couverture pleine page (theme clair) */
        .cover {{
            page: cover;
            page-break-after: always;
            position: relative;
            width: 210mm;
            height: 297mm;
            background-color: #fafaf9;
            background-image:
                linear-gradient(to bottom, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.55) 55%, rgba(255,255,255,0.95) 100%),
                url('{cover_uri}');
            background-size: cover, cover;
            background-position: center, center;
            background-repeat: no-repeat, no-repeat;
            color: #1a1a1a;
        }}
        .cover-bar {{ position: absolute; top: 0; left: 0; right: 0; height: 5mm; background: #334155; }}
        .cover-inner {{ position: absolute; left: 0; right: 0; bottom: 0; padding: 22mm 20mm; }}
        .cover-kicker {{
            font-size: 10pt; letter-spacing: 3px; text-transform: uppercase;
            color: #b45309; margin-bottom: 6mm;
        }}
        .cover-org {{ font-size: 11pt; color: #555; margin-bottom: 3mm; }}
        .cover-title {{ font-size: 30pt; font-weight: 700; line-height: 1.12; margin: 0 0 8mm; color: #111; }}
        .cover-meta {{ font-size: 10pt; color: #666; }}
        .cover-mark {{
            display: inline-block; margin-top: 9mm; margin-right: 6mm; padding: 4px 12px;
            font-weight: 700; font-size: 11pt; background: #000;
        }}

        /* Sommaire */
        .toc {{ page-break-after: always; }}
        .toc-title {{ font-size: 18pt; border-bottom: 2px solid #ddd; padding-bottom: 0.3em; margin-bottom: 1em; }}
        .toc-item {{ margin: 5pt 0; font-size: 11pt; }}
        .toc-item a {{ display: block; color: #1a1a1a; text-decoration: none; }}
        .toc-item a::after {{
            content: leader('.') ' ' target-counter(attr(href), page);
            color: #666;
        }}
        .toc-l2 {{ margin-left: 1.3em; font-size: 10.5pt; }}
        .toc-l3 {{ margin-left: 2.6em; font-size: 10pt; color: #444; }}

        /* Objectifs de l'enquete (apres le sommaire, sur sa propre page) */
        .objectives {{ page-break-after: always; }}
        .objectives-title {{
            font-size: 18pt; border-bottom: 2px solid #ddd;
            padding-bottom: 0.3em; margin-bottom: 1em;
        }}
        .objectives-body {{ font-size: 11pt; line-height: 1.6; color: #1a1a1a; }}
    </style>
</head>
<body>
    <div class="cover">
        <div class="cover-bar"></div>
        <div class="cover-inner">
            <div class="cover-kicker">Tracr · Investigation</div>
            <div class="cover-org">{_escape(investigation_title)}</div>
            <div class="cover-title">{_escape(title)}</div>
            <div class="cover-meta">Exporte le {date_str}</div>
            {cover_badge}
        </div>
    </div>
    {toc_html}
    {objectives_html}
    <h1 class="doc-title">{_escape(title)}</h1>
    {content_html}
</body>
</html>
"""


def _generate_map_image(lat: float, lng: float) -> str | None:
    """Génère une image de carte statique via tuiles OSM et retourne un data URI base64."""
    try:
        import io
        from staticmap import StaticMap, CircleMarker
        m = StaticMap(600, 200, url_template="https://tile.openstreetmap.org/{z}/{x}/{y}.png")
        m.add_marker(CircleMarker((lng, lat), "#e74c3c", 14))
        image = m.render(zoom=14)
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f"data:image/png;base64,{b64}"
    except Exception:
        return None


_SOURCE_VIEW_RE = re.compile(r'src="(https?://[^"]*?/sources/(\d+)/view\?sig=([A-Za-z0-9]+)[^"]*)"')


def _inline_source_views(html: str, db) -> str:
    """Remplace les <img src=".../sources/{id}/view?sig=..."> par des data URI en
    lisant les octets DIRECTEMENT depuis le stockage (pas de requête HTTP vers le
    backend lui-même, qui provoquerait un deadlock pendant l'export)."""
    from services import source_service

    def _replace(match: re.Match) -> str:
        sid, sig = int(match.group(2)), match.group(3)
        try:
            source = source_service.get_source(db, sid)
            if not source or not source_service.verify_view_signature(source, sig):
                return match.group(0)
            data = source_service.get_content(source)
            mime = source.mime_type or "image/png"
            b64 = base64.b64encode(data).decode()
            return f'src="data:{mime};base64,{b64}"'
        except Exception:
            return match.group(0)

    return _SOURCE_VIEW_RE.sub(_replace, html)


def _embed_external_images(html: str) -> str:
    """Remplace les src des <img> par des data URI base64.

    - URLs staticmap.openstreetmap.de : génération locale via tuiles OSM.
    - Autres URLs https : fetch direct.
    """
    def _replace(match: re.Match) -> str:
        src = match.group(1)
        # Nos URLs /sources/{id}/view sont résolues localement en amont : ne JAMAIS
        # les fetch en HTTP (boucle vers le backend → deadlock).
        if "/sources/" in src and "/view" in src:
            return match.group(0)
        try:
            if "staticmap.openstreetmap.de" in src:
                center = re.search(r"center=([\d.\-]+),([\d.\-]+)", src)
                if center:
                    data_uri = _generate_map_image(float(center.group(1)), float(center.group(2)))
                    if data_uri:
                        return f'src="{data_uri}"'
            resp = http_requests.get(src, timeout=10, headers={"User-Agent": "tracr-investigation/1.0"})
            resp.raise_for_status()
            mime = resp.headers.get("content-type", "image/png").split(";")[0]
            b64 = base64.b64encode(resp.content).decode()
            return f'src="data:{mime};base64,{b64}"'
        except Exception:
            return match.group(0)

    return re.sub(r'src="(https?://[^"]+)"', _replace, html)


def render_pdf(
    document: Document,
    db=None,
    *,
    tlp: Optional[str] = None,
    pap: Optional[str] = None,
    investigation_title: str = "",
    investigation_objectives: Optional[str] = None,
) -> Tuple[bytes, str]:
    """Retourne (bytes PDF, filename).

    `db` permet d'inliner les sources archivées et de charger l'image de couverture
    sans requête HTTP vers le backend. `tlp` et `pap` sont les niveaux de marquage
    (independants : aucun, l'un, l'autre, ou les deux) apposes en pied de page.
    """
    from weasyprint import HTML

    # Marquages independants : on peut afficher TLP et PAP simultanement.
    markings = [m for m in (_marking_meta("TLP", tlp), _marking_meta("PAP", pap)) if m]
    cover_uri = _cover_data_uri(document, db)
    # Assainir AVANT d'injecter les ancres : nh3 retirerait les `id` sinon.
    sanitized = sanitize_editor_html(document.content_html or "")
    toc_html, anchored_content = _build_toc(sanitized)
    objectives_html = _objectives_section(investigation_objectives)

    html_str = _wrap_html(
        document.title,
        investigation_title,
        anchored_content,
        toc_html,
        objectives_html,
        cover_uri,
        markings,
    )
    if db is not None:
        html_str = _inline_source_views(html_str, db)
    html_str = _embed_external_images(html_str)
    pdf_bytes = HTML(string=html_str).write_pdf()
    if pdf_bytes is None:
        raise RuntimeError("WeasyPrint returned no bytes")
    safe_name = _safe_filename(document.title)
    return pdf_bytes, f"{safe_name}.pdf"


def _safe_filename(title: str) -> str:
    """Nom de fichier basique, sans caractères problématiques."""
    keep = []
    for ch in (title or "document"):
        if ch.isalnum() or ch in ("-", "_", " "):
            keep.append(ch)
    name = "".join(keep).strip().replace(" ", "_")
    return name or "document"
