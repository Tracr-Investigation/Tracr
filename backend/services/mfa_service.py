"""MFA TOTP (RFC 6238) — 100 % hors-ligne, aucune dependance externe.

Le secret est partage une seule fois (QR code) puis le code a 6 chiffres est
calcule localement par l'app d'authentification a partir du secret + l'heure.
"""
import base64
import io

import pyotp
import qrcode

ISSUER = "Tracr"


def generate_secret() -> str:
    """Genere un secret TOTP base32 (a chiffrer avant stockage)."""
    return pyotp.random_base32()


def provisioning_uri(secret: str, pseudo: str) -> str:
    """URI otpauth:// a encoder dans le QR code (compatible Google Authenticator, etc.)."""
    return pyotp.TOTP(secret).provisioning_uri(name=pseudo, issuer_name=ISSUER)


def verify_code(secret: str, code: str) -> bool:
    """Verifie un code TOTP. `valid_window=1` tolere +/- 30s de derive d'horloge."""
    if not secret or not code:
        return False
    cleaned = code.strip().replace(" ", "")
    if not cleaned.isdigit():
        return False
    return pyotp.TOTP(secret).verify(cleaned, valid_window=1)


def qr_data_uri(uri: str) -> str:
    """Rend le QR code de l'URI otpauth en data URI PNG (affichable directement)."""
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"
