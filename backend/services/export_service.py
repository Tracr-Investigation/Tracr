"""Export d'un document HTML en PDF (WeasyPrint)."""
import re
import base64
from typing import Tuple

import requests as http_requests

from models.document import Document
from utils.html_sanitize import sanitize_editor_html


def _wrap_html(title: str, content_html: str) -> str:
    """Enveloppe le contenu de l'éditeur dans un HTML print-ready."""
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
            border-left: 3px solid #8b5cf6;
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
    </style>
</head>
<body>
    <h1 class="doc-title">{_escape(title)}</h1>
    {sanitize_editor_html(content_html)}
</body>
</html>
"""


def _escape(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


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


def _embed_external_images(html: str) -> str:
    """Remplace les src des <img> par des data URI base64.

    - URLs staticmap.openstreetmap.de : génération locale via tuiles OSM.
    - Autres URLs https : fetch direct.
    """
    def _replace(match: re.Match) -> str:
        src = match.group(1)
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


def render_pdf(document: Document) -> Tuple[bytes, str]:
    """Retourne (bytes PDF, filename)."""
    from weasyprint import HTML

    html_str = _wrap_html(document.title, document.content_html or "")
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
