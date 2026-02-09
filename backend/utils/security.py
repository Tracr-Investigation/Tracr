from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import Header, HTTPException
from jose import jwt, JWTError

from config import settings


def verify_token(authorization: str = Header(None)) -> dict:
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
