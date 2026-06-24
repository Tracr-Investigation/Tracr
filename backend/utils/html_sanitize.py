"""html_sanitize.py -- sanitization of TipTap editor HTML (anti-XSS).

Allowlist of tags/attributes/URL schemes passed to nh3: keeps legitimate
formatting and strips scripts, handlers and dangerous URIs.
"""
import nh3

# Tags produits par TipTap
_ALLOWED_TAGS = frozenset({
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr", "blockquote", "pre", "code", "div",
    "strong", "b", "em", "i", "u", "s", "del", "mark", "span",
    "a", "img",
    "ul", "ol", "li",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
})

# Attributs autorisés par tag.
# "*" s'applique à tous les tags
# les attributs non listés sont supprimés par nh3.
_ALLOWED_ATTRS: dict[str, set[str]] = {
    "*": {"class", "style"},
    "a": {"href", "target"},  
    "img": {"src", "alt", "title"},
    "th": {"colspan", "rowspan"},
    "td": {"colspan", "rowspan"},
    "ul": {"data-type"},
    "li": {"data-checked"},
    "span": {"data-comment-id", "data-resolved"},
    "div": {"data-type", "data-lat", "data-lng", "data-address"},
}

# Seuls ces schémas d'URL sont autorisés dans href/src.
# Bloque javascript:, vbscript:
_SAFE_URL_SCHEMES = frozenset({"http", "https", "mailto"})


def sanitize_editor_html(html: str) -> str:
    """Clean HTML coming from the TipTap editor.

    Removes: <script>, <iframe>, on* handlers, javascript:/data: URIs.
    Keeps: formatting, TipTap colors/highlights, task lists, comment marks,
           links and images over http(s).
    """
    if not html:
        return html
    return nh3.clean(html, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, url_schemes=_SAFE_URL_SCHEMES, link_rel="noopener noreferrer", strip_comments=True,
    )
