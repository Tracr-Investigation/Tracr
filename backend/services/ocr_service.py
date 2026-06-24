"""ocr_service.py -- text recognition (OCR) on images.

Local, self-hosted (Tesseract via pytesseract): no image leaves the server, preserving evidence confidentiality. Output feeds the same `extracted_text` column as HTML/MHTML extraction; the matching engine (hit_service) is unaware of OCR.
"""
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Langues reconnues (doivent etre installees dans l'image : tesseract-ocr-fra/-eng)
_LANGS = "fra+eng"

# Plafond identique a l'extraction texte (coherence en base)
_MAX_TEXT_CHARS = 2_000_000


def is_ocr_candidate(mime_type: str) -> bool:
    """Goal: tell whether a source is an OCR candidate (bitmap image). Input: mime_type. Output: bool."""
    return (mime_type or "").lower().startswith("image/")


def ocr_image(content: bytes) -> Optional[str]:
    """Goal: extract text from an image (deferred imports; tolerates missing Tesseract). Input: content (bytes). Output: text or None if OCR fails/finds nothing."""
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        logger.warning("OCR indisponible : pytesseract/Pillow non installes")
        return None

    try:
        with Image.open(io.BytesIO(content)) as img:
            # L'OCR est plus fiable sur du niveau de gris
            text = pytesseract.image_to_string(img.convert("L"), lang=_LANGS)
    except Exception as exc:  # image illisible, langue manquante, binaire absent...
        logger.warning("Echec OCR : %s", exc)
        return None

    text = (text or "").strip()
    return text[:_MAX_TEXT_CHARS] if text else None
