"""security.py -- issuing and verifying JWT tokens (HS256).

Main session token (verify_token/create_token) plus a short single-use MFA
challenge token (after password, before TOTP code).
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import Header, HTTPException
from jose import jwt, JWTError

from config import settings


def verify_token(authorization: str = Header(None)) -> dict:
    """Verify the Authorization Bearer header and return the JWT payload (401 if invalid)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

    if "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Token invalide")

    return payload


def create_token(user_id: int) -> str:
    """Issue a session JWT for a user (expires after JWT_EXPIRATION_HOURS)."""
    now = datetime.now(ZoneInfo("Europe/Paris"))
    return jwt.encode(
        {
            "user_id": user_id,
            "iat": now,
            "exp": now + timedelta(hours=settings.JWT_EXPIRATION_HOURS),
        },
        settings.SECRET_KEY,
        algorithm="HS256",
    )


def create_mfa_challenge_token(user_id: int) -> str:
    """Short-lived token (5 min) issued after the password, pending the TOTP code.

    Grants access to NOTHING other than the MFA verification step (dedicated scope)."""
    now = datetime.now(ZoneInfo("Europe/Paris"))
    return jwt.encode(
        {
            "user_id": user_id,
            "scope": "mfa_challenge",
            "iat": now,
            "exp": now + timedelta(minutes=5),
        },
        settings.SECRET_KEY,
        algorithm="HS256",
    )


def verify_mfa_challenge_token(token: str) -> int | None:
    """Return the user id if the MFA challenge token is valid, otherwise None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return None
    if payload.get("scope") != "mfa_challenge" or "user_id" not in payload:
        return None
    return payload["user_id"]
