"""crypto.py -- symmetric encryption of sensitive secrets (AES-256-GCM).

Key derived via HKDF-SHA256 from MFA_ENCRYPTION_KEY (or SECRET_KEY). Used to
encrypt TOTP secrets at rest; supports an AAD to bind the ciphertext to its
context (e.g. id_user).
"""
import base64
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from config import settings

_VERSION = b"\x01"
_INFO = b"tracr-mfa-totp-aes256gcm-v1"
_NONCE_LEN = 12  # 96 bits, recommande pour GCM

_KEY_CACHE: bytes | None = None


def _base_key() -> bytes:
    """Base key: MFA_ENCRYPTION_KEY if set, otherwise SECRET_KEY."""
    raw = getattr(settings, "MFA_ENCRYPTION_KEY", None)
    if raw:
        try:
            return base64.urlsafe_b64decode(raw)
        except Exception:
            return raw.encode("utf-8")
    return settings.SECRET_KEY.encode("utf-8")


def _key() -> bytes:
    """Derived AES-256 key (HKDF-SHA256), cached."""
    global _KEY_CACHE
    if _KEY_CACHE is None:
        _KEY_CACHE = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=_INFO,
        ).derive(_base_key())
    return _KEY_CACHE


def encrypt(plaintext: str, aad: str | None = None) -> str:
    """Encrypt a string; returns a base64 token (version|nonce|ciphertext+tag)."""
    nonce = os.urandom(_NONCE_LEN)
    ct = AESGCM(_key()).encrypt(
        nonce,
        plaintext.encode("utf-8"),
        aad.encode("utf-8") if aad else None,
    )
    return base64.urlsafe_b64encode(_VERSION + nonce + ct).decode("utf-8")


def decrypt(token: str, aad: str | None = None) -> str | None:
    """Decrypt a token; returns None if invalid (key changed, AAD mismatch,
    integrity compromised)."""
    try:
        blob = base64.urlsafe_b64decode(token.encode("utf-8"))
        if blob[:1] != _VERSION:
            return None
        nonce = blob[1:1 + _NONCE_LEN]
        ct = blob[1 + _NONCE_LEN:]
        pt = AESGCM(_key()).decrypt(
            nonce,
            ct,
            aad.encode("utf-8") if aad else None,
        )
        return pt.decode("utf-8")
    except Exception:
        return None
