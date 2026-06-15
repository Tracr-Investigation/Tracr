"""ocr_service.py -- reconnaissance de texte (OCR) sur les images.

Fournisseur de texte complementaire pour les sources sans texte natif (captures
de medias, photos). Local et auto-heberge (Tesseract via pytesseract) : aucune
image ne sort du serveur, ce qui preserve la confidentialite des preuves.

Le texte produit alimente la meme colonne `extracted_text` que l'extraction
HTML/MHTML ; le moteur de matching (hit_service) n'a pas connaissance de l'OCR.
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
    """Une source est candidate a l'OCR si c'est une image bitmap."""
    return (mime_type or "").lower().startswith("image/")


def ocr_image(content: bytes) -> Optional[str]:
    """Extrait le texte d'une image. Retourne None si l'OCR echoue ou ne trouve
    rien d'exploitable. Les imports sont differes pour ne pas peser au demarrage
    et tolerer une image sans Tesseract installe."""
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
