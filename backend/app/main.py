from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import sys
import os
from jose import jwt, JWTError

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.user import User
from services import user_service
from sqlmodel import Session, create_engine
from config import settings

engine = create_engine(settings.DATABASE_URL)


def get_db():
    with Session(engine) as session:
        yield session


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_token(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token manquant")

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")


class LoginRequest(BaseModel):
    pseudo: str
    password: str


@app.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = user_service.authenticate_user(db, request.pseudo, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    token = jwt.encode({"user_id": user.id_user}, settings.SECRET_KEY, algorithm="HS256")

    return {
        "token": token,
        "id_user": user.id_user,
        "pseudo": user.pseudo
    }


@app.get("/me")
async def get_me(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")

    return {
        "id_user": user.id_user,
        "pseudo": user.pseudo
    }