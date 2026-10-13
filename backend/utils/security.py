"""security.py -- issuing and verifying JWT tokens (HS256).

Main session token (verify_token/create_token) plus a short single-use MFA
challenge token (after password, before TOTP code). Each token carries an explicit
scope so one can never be used in place of the other.
"""
from uuid import UUID
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import Header, HTTPException
from jose import jwt, JWTError

from config import settings

SESSION_SCOPE = "session"
MFA_CHALLENGE_SCOPE = "mfa_challenge"


def user_id_from_payload(payload: dict, scope: str) -> UUID | None:
    """Return the user UUID of a decoded JWT payload if it has the expected scope, otherwise None."""
    if payload.get("scope") != scope:
        return None
    try:
        return UUID(str(payload.get("user_id")))
    except (TypeError, ValueError):
        return None


def verify_token(authorization: str = Header(None)) -> dict:
    """Verify the Authorization Bearer header and return the JWT payload (401 if invalid)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

    # Le scope "session" est exige : un jeton de challenge MFA (emis apres le seul
    # mot de passe) ne doit jamais ouvrir l'API.
    user_id = user_id_from_payload(payload, SESSION_SCOPE)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token invalide")

    payload["user_id"] = user_id
    return payload


def create_token(user_id: UUID) -> str:
    """Issue a session JWT for a user (expires after JWT_EXPIRATION_HOURS)."""
    now = datetime.now(ZoneInfo("Europe/Paris"))
    return jwt.encode(
        {
            "user_id": str(user_id),
            "scope": SESSION_SCOPE,
            "iat": now,
            "exp": now + timedelta(hours=settings.JWT_EXPIRATION_HOURS),
        },
        settings.SECRET_KEY,
        algorithm="HS256",
    )


def create_mfa_challenge_token(user_id: UUID) -> str:
    """Short-lived token (5 min) issued after the password, pending the TOTP code.

    Grants access to NOTHING other than the MFA verification step (dedicated scope)."""
    now = datetime.now(ZoneInfo("Europe/Paris"))
    return jwt.encode(
        {
            "user_id": str(user_id),
            "scope": MFA_CHALLENGE_SCOPE,
            "iat": now,
            "exp": now + timedelta(minutes=5),
        },
        settings.SECRET_KEY,
        algorithm="HS256",
    )


def verify_mfa_challenge_token(token: str) -> UUID | None:
    """Return the user id if the MFA challenge token is valid, otherwise None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return None
    return user_id_from_payload(payload, MFA_CHALLENGE_SCOPE)
