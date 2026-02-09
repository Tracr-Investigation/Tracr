from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import IntegrityError
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services import user_service
from sqlmodel import Session, create_engine
from config import settings
from utils.security import verify_token, create_token
from utils.schemas import LoginRequest, RegisterRequest, ChangePasswordRequest

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

limiter = Limiter(key_func=get_remote_address)


def get_db():
    with Session(engine) as session:
        yield session


app = FastAPI()
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Trop de tentatives. Réessayez plus tard."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    return response


@app.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = user_service.authenticate_user(db, body.pseudo, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    token = create_token(user.id_user)
    user_service.update_last_login(db, user)
    role = user_service.get_user_role(db, user.id_user)

    return {
        "token": token,
        "id_user": user.id_user,
        "pseudo": user.pseudo,
        "role": role,
    }


@app.post("/register")
@limiter.limit("3/minute")
async def register(
    request: Request, body: RegisterRequest, db: Session = Depends(get_db)
):
    existing = user_service.get_user_by_pseudo(db, body.pseudo)
    if existing:
        raise HTTPException(status_code=409, detail="Ce pseudo est déjà utilisé")

    try:
        user = user_service.create_user(db, body.pseudo, body.password)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Ce pseudo est déjà utilisé")

    return {"id_user": user.id_user, "pseudo": user.pseudo, "role": "user"}


@app.get("/me")
async def get_me(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    role = user_service.get_user_role(db, user.id_user)

    return {
        "id_user": user.id_user,
        "pseudo": user.pseudo,
        "role": role,
    }


@app.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    if not user_service.verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")

    user_service.update_password(db, user, body.new_password)

    return {"detail": "Mot de passe modifié avec succès"}
