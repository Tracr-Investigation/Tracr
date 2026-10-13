"""report_blocks.py -- report-specific blocks of the PDF export.

Transforms applied to the (already sanitized) editor HTML and extra sections
generated around it:
  - redaction of passages marked in the editor (redacted version of the PDF);
  - numbering of figure/table captions + table of figures;
  - "Gestion du document" sheet, summary page;
  - annexes: cited archived sources, Admiralty rating grid.
"""
import html as html_lib
import re
from datetime import date
from html.parser import HTMLParser
from typing import List, Optional, Tuple


_REDACTION_CHAR = "█"
_VOID_TAGS = frozenset({"br", "img", "hr", "col", "input", "wbr"})


def _escape(s: str) -> str:
    """Goal: HTML-escape a user string. Input: s. Output: escaped str."""
    return html_lib.escape(s or "", quote=True)


def _multiline(s: str) -> str:
    """Goal: escape free text and keep its line breaks. Input: s. Output: HTML str."""
    return "<br>".join(_escape(line) for line in (s or "").strip().split("\n"))


# ── Caviardage ───────────────────────────────────────────────────────────────

class _Redactor(HTMLParser):
    """Re-serialize HTML, replacing the content of <span data-redacted> with black blocks.

    The redacted text never reaches the PDF (no hidden text): every non-blank
    character becomes a block, nested tags (images, footnotes, ratings...) are dropped.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.out: List[str] = []
        self.depth = 0  # profondeur des <span> a l'interieur d'un passage caviarde

    def _mask(self, text: str) -> str:
        return "".join(c if c.isspace() else _REDACTION_CHAR for c in text)

    def handle_starttag(self, tag, attrs):
        if self.depth:
            if tag == "span":
                self.depth += 1
            return
        if tag == "span" and any(name == "data-redacted" for name, _ in attrs):
            self.depth = 1
            self.out.append('<span class="redacted">')
            return
        self.out.append(self.get_starttag_text() or "")

    def handle_startendtag(self, tag, attrs):
        if not self.depth:
            self.out.append(self.get_starttag_text() or "")

    def handle_endtag(self, tag):
        if self.depth:
            if tag == "span":
                self.depth -= 1
                if not self.depth:
                    self.out.append("</span>")
            return
        if tag not in _VOID_TAGS:
            self.out.append(f"</{tag}>")

    def handle_data(self, data):
        self.out.append(self._mask(data) if self.depth else data)

    def handle_entityref(self, name):
        self.out.append(_REDACTION_CHAR if self.depth else f"&{name};")

    def handle_charref(self, name):
        self.out.append(_REDACTION_CHAR if self.depth else f"&#{name};")


def apply_redaction(html: str) -> str:
    """Goal: black out every passage marked as redacted. Input: sanitized HTML. Output: HTML where redacted text is replaced by block characters."""
    if "data-redacted" not in (html or ""):
        return html
    parser = _Redactor()
    parser.feed(html)
    parser.close()
    return "".join(parser.out)


# ── Legendes ─────────────────────────────────────────────────────────────────

_CAPTION_RE = re.compile(
    r'<p\b([^>]*)\bdata-caption="(figure|table)"([^>]*)>(.*?)</p>',
    re.IGNORECASE | re.DOTALL,
)
_TAG_RE = re.compile(r"<[^>]+>")
_CAPTION_LABELS = {"figure": "Figure", "table": "Tableau"}


def number_captions(html: str) -> Tuple[str, str]:
    """Goal: number figure/table captions and build the table of figures. Input: sanitized HTML. Output: (HTML with numbered, anchored captions, table-of-figures HTML or "")."""
    counters = {"figure": 0, "table": 0}
    entries = []  # (anchor, label)

    def _replace(match: re.Match) -> str:
        kind = match.group(2).lower()
        counters[kind] += 1
        number = f"{_CAPTION_LABELS[kind]} {counters[kind]}"
        anchor = f"cap-{kind}-{counters[kind]}"
        inner = match.group(4)
        text = _TAG_RE.sub("", inner).strip()
        entries.append((anchor, f"{number} : {text}" if text else number))
        separator = " : " if text else ""
        return (
            f'<p id="{anchor}" class="caption" data-caption="{kind}">'
            f'<span class="caption-label">{number}{separator}</span>{inner}</p>'
        )

    numbered = _CAPTION_RE.sub(_replace, html or "")
    if not entries:
        return numbered, ""
    items = "".join(
        f'<div class="toc-item toc-l2"><a href="#{anchor}">{label}</a></div>'
        for anchor, label in entries
    )
    return numbered, (
        '<section class="toc">'
        '<h2 class="toc-title">Table des figures</h2>'
        f"{items}</section>"
    )


# ── Pages d'en-tete ──────────────────────────────────────────────────────────

def document_control_section(
    document, author: Optional[str], investigation_title: str,
    period: str, markings: list, export_date: str,
) -> str:
    """Goal: build the "Gestion du document" page. Input: document (version/reviewer/validated_at/distribution), author pseudo, investigation title, analysis period label, markings, export date. Output: section HTML, or "" when no control field is filled."""
    validated: Optional[date] = document.validated_at
    if not any((document.version, document.reviewer, validated, document.distribution)):
        return ""
    rows = [
        ("Document", _escape(document.title)),
        ("Enquête", _escape(investigation_title)),
        ("Version", _escape(document.version or "")),
        ("Rédacteur", _escape(author or "")),
        ("Relecteur", _escape(document.reviewer or "")),
        ("Date de validation", validated.strftime("%d/%m/%Y") if validated else ""),
        ("Période d'analyse", _escape(period)),
        ("Marquage", " · ".join(_escape(m[0]) for m in markings)),
        ("Diffusion", _multiline(document.distribution or "")),
        ("Date d'export", export_date),
    ]
    body = "".join(
        f'<tr><th>{label}</th><td>{value or "-"}</td></tr>' for label, value in rows
    )
    return (
        '<section class="front-page">'
        '<h2 class="front-title">Gestion du document</h2>'
        f'<table class="control-sheet">{body}</table>'
        "</section>"
    )


def summary_section(summary: Optional[str]) -> str:
    """Goal: build the "Synthèse" page. Input: free-text summary. Output: section HTML, or "" when empty."""
    if not (summary or "").strip():
        return ""
    return (
        '<section class="front-page">'
        '<h2 class="front-title">Synthèse</h2>'
        f'<div class="summary-body">{_multiline(summary)}</div>'
        "</section>"
    )


# ── Annexes ──────────────────────────────────────────────────────────────────

_SOURCE_VIEW_ID_RE = re.compile(r"/sources/(\d+)/view")
_HREF_RE = re.compile(r'href="([^"]+)"')

_SOURCE_TYPE_LABELS = {
    "page_screenshot": "Capture d'écran",
    "page_mhtml": "Page archivée",
    "media": "Média",
    "web_archive": "Archive web",
    "manual_file": "Fichier",
}


def cited_sources(db, id_investigation: int, html: str) -> list:
    """Goal: list the investigation's archived sources cited in the document, in order of first citation. Input: db, id_investigation, sanitized HTML. Output: list of InvestigationSource (by embedded view id, or by link URL)."""
    from models.source import InvestigationSource

    ids: List[int] = []
    for match in _SOURCE_VIEW_ID_RE.finditer(html or ""):
        sid = int(match.group(1))
        if sid not in ids:
            ids.append(sid)
    urls: List[str] = []
    for match in _HREF_RE.finditer(html or ""):
        url = html_lib.unescape(match.group(1))
        if url not in urls:
            urls.append(url)
    if not ids and not urls:
        return []

    query = db.query(InvestigationSource).filter(InvestigationSource.id_investigation == id_investigation)
    candidates = query.filter(
        InvestigationSource.id_source.in_(ids) | InvestigationSource.source_url.in_(urls)
    ).all()

    def _rank(source) -> Tuple[int, int]:
        if source.id_source in ids:
            return ids.index(source.id_source), 0
        return len(ids) + urls.index(source.source_url), source.id_source

    return sorted(candidates, key=_rank)


def sources_annex(sources: list) -> str:
    """Goal: build the "Sources citées" annex. Input: list of InvestigationSource. Output: annex HTML, or "" when no source is cited."""
    if not sources:
        return ""
    rows = []
    for index, source in enumerate(sources, start=1):
        captured = source.captured_at.strftime("%d/%m/%Y %H:%M") if source.captured_at else "-"
        rows.append(
            "<tr>"
            f"<td>{index}</td>"
            f'<td><strong>{_escape(source.title)}</strong><br><span class="annex-url">{_escape(source.source_url)}</span></td>'
            f"<td>{_SOURCE_TYPE_LABELS.get(source.source_type, _escape(source.source_type))}</td>"
            f"<td>{captured}</td>"
            f'<td class="annex-hash">{_escape(source.content_hash)}</td>'
            "</tr>"
        )
    return (
        '<section class="annex">'
        "<h1>Annexe : sources citées</h1>"
        "<p>Sources archivées citées dans ce document. L'empreinte SHA-256 permet "
        "de vérifier l'intégrité de chaque capture.</p>"
        '<table class="annex-table"><tr><th>N°</th><th>Source</th><th>Type</th>'
        "<th>Capturée le</th><th>SHA-256</th></tr>"
        + "".join(rows)
        + "</table></section>"
    )


SOURCE_RELIABILITY = [
    ("A", "Totalement fiable"),
    ("B", "Habituellement fiable"),
    ("C", "Assez fiable"),
    ("D", "Pas toujours fiable"),
    ("E", "Peu fiable"),
    ("F", "Fiabilité ne pouvant être évaluée"),
]
INFO_CREDIBILITY = [
    ("1", "Confirmée par d'autres sources"),
    ("2", "Probablement vraie"),
    ("3", "Possiblement vraie"),
    ("4", "Douteuse"),
    ("5", "Improbable"),
    ("6", "Véracité ne pouvant être évaluée"),
]


def rating_grid_annex(html: str) -> str:
    """Goal: build the Admiralty grid annex when the document uses ratings. Input: HTML. Output: annex HTML, or "" when no rating is used."""
    if "data-rating" not in (html or ""):
        return ""

    def _table(title: str, rows) -> str:
        body = "".join(f"<tr><td><strong>{code}</strong></td><td>{label}</td></tr>" for code, label in rows)
        return f'<table class="annex-table grid-table"><tr><th colspan="2">{title}</th></tr>{body}</table>'

    return (
        '<section class="annex">'
        "<h1>Annexe : grille de cotation</h1>"
        "<p>Les informations sont cotées selon le système de l'Amirauté : une lettre "
        "pour la fiabilité de la source, un chiffre pour la crédibilité de l'information "
        "(ex. B2 = source habituellement fiable, information probablement vraie).</p>"
        + _table("Fiabilité de la source", SOURCE_RELIABILITY)
        + _table("Crédibilité de l'information", INFO_CREDIBILITY)
        + "</section>"
    )
