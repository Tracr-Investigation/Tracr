"""MFA TOTP (RFC 6238) -- fully offline, no external dependency.

The secret is shared once (QR code), then the 6-digit code is computed locally by the authenticator app from secret + time.
"""
import base64
import io

import pyotp
import qrcode

ISSUER = "Tracr"


def generate_secret() -> str:
    """Goal: generate a base32 TOTP secret (encrypt before storing). Input: none. Output: secret string."""
    return pyotp.random_base32()


def provisioning_uri(secret: str, pseudo: str) -> str:
    """Goal: build the otpauth:// URI to encode in the QR (Google Authenticator-compatible). Input: secret, pseudo. Output: URI string."""
    return pyotp.TOTP(secret).provisioning_uri(name=pseudo, issuer_name=ISSUER)


def verify_code(secret: str, code: str) -> bool:
    """Goal: verify a TOTP code (valid_window=1 tolerates +/-30s drift). Input: secret, code. Output: bool."""
    if not secret or not code:
        return False
    cleaned = code.strip().replace(" ", "")
    if not cleaned.isdigit():
        return False
    return pyotp.TOTP(secret).verify(cleaned, valid_window=1)


def qr_data_uri(uri: str) -> str:
    """Goal: render the otpauth URI's QR as a PNG data URI. Input: uri. Output: data-URI string."""
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"
