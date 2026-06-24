"""text_extraction_service.py -- extract searchable text from a source.

Turns a capture's binary into plain text matched against selectors (cf. hit_service). Stdlib only: `html.parser` for HTML, `email` for MHTML (multipart/related). Images/videos aren't handled here (OCR out of scope) and come out as `pending_ocr`/`none`.
"""
import email
from email import policy
from html.parser import HTMLParser
from typing import Optional

# Plafond du texte stocke par source (evite de gonfler la base sur de grosses pages)
MAX_TEXT_CHARS = 2_000_000

# Statuts d'analyse textuelle d'une source
STATUS_EXTRACTED = "extracted"   # texte disponible
STATUS_PENDING_OCR = "pending_ocr"  # image sans texte : OCR a venir
STATUS_NONE = "none"             # non analysable (video, format inconnu)
STATUS_UNPROCESSED = "unprocessed"  # pas encore analysee (lignes anterieures a la feature)

_SKIP_TAGS = {"script", "style", "head", "noscript", "template"}


class _TextHTMLParser(HTMLParser):
    """Collect the visible text of an HTML document, skipping script/style/head."""

    def __init__(self) -> None:
        """Goal: initialize the parser state. Input: none. Output: None."""
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        """Goal: enter skip mode on script/style/head tags. Input: tag, attrs. Output: None."""
        if tag in _SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        """Goal: leave skip mode on closing skip tags. Input: tag. Output: None."""
        if tag in _SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data):
        """Goal: collect non-empty text outside skipped tags. Input: data. Output: None."""
        if self._skip_depth == 0:
            text = data.strip()
            if text:
                self._parts.append(text)

    def get_text(self) -> str:
        """Goal: return the collected visible text. Input: none. Output: text string."""
        return " ".join(self._parts)


def _html_to_text(html: str) -> str:
    """Goal: extract visible text from an HTML string (tolerant parser). Input: html. Output: text string."""
    parser = _TextHTMLParser()
    try:
        parser.feed(html)
    except Exception:
        # Parser tolerant : on renvoie ce qui a pu etre collecte
        pass
    return parser.get_text()


def _decode(payload: bytes, charset: Optional[str]) -> str:
    """Goal: decode bytes trying charset then utf-8/latin-1 fallbacks. Input: payload, charset. Output: decoded string."""
    for enc in (charset, "utf-8", "latin-1"):
        if not enc:
            continue
        try:
            return payload.decode(enc, errors="replace")
        except (LookupError, UnicodeDecodeError):
            continue
    return payload.decode("utf-8", errors="replace")


def _mhtml_to_text(content: bytes) -> str:
    """Goal: extract text from the HTML/text parts of an MHTML archive. Input: content (bytes). Output: text string."""
    msg = email.message_from_bytes(content, policy=policy.default)
    chunks: list[str] = []
    for part in msg.walk():
        ctype = (part.get_content_type() or "").lower()
        if ctype not in ("text/html", "text/plain"):
            continue
        payload = part.get_payload(decode=True)
        if not payload:
            continue
        text = _decode(payload, part.get_content_charset())
        chunks.append(_html_to_text(text) if ctype == "text/html" else text)
    return "\n".join(c for c in chunks if c.strip())


def extract_text(content: bytes, mime_type: str, source_type: str) -> tuple[Optional[str], str]:
    """Goal: extract (text, status) from a source binary. Input: content, mime_type, source_type. Output: (text or None, status) where status is extracted/pending_ocr/none."""
    mime = (mime_type or "").lower()
    text: Optional[str] = None

    try:
        if "html" in mime:
            text = _html_to_text(_decode(content, None))
        elif mime in ("multipart/related", "message/rfc822") or source_type in ("page_mhtml", "web_archive"):
            text = _mhtml_to_text(content)
        elif mime.startswith("text/"):
            text = _decode(content, None)
    except Exception:
        text = None

    if text and text.strip():
        return text.strip()[:MAX_TEXT_CHARS], STATUS_EXTRACTED

    # Pas de texte : image -> candidate a l'OCR ; reste -> non analysable.
    if mime.startswith("image/"):
        return None, STATUS_PENDING_OCR
    return None, STATUS_NONE
