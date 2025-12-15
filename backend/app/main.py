from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.user import User
from services import user_service
from sqlmodel import Session, create_engine

# Config DB
DATABASE_URL = "postgresql://usertracr:ZFeD3n2UD6n6FIUWDwxtpuEkWgHFcH19heM@localhost:5432/tracrdb"
engine = create_engine(DATABASE_URL)


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


class LoginRequest(BaseModel):
    pseudo: str
    password: str


class LoginResponse(BaseModel):
    id_user: int
    pseudo: str
    message: str


@app.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = user_service.authenticate_user(db, request.pseudo, request.password)

    if not user:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    # Mettre à jour last_login_at
    from datetime import datetime
    from zoneinfo import ZoneInfo
    user.last_login_at = datetime.now(ZoneInfo("Europe/Paris"))
    db.add(user)
    db.commit()

    return LoginResponse(
        id_user=user.id_user,
        pseudo=user.pseudo,
        message="Connexion réussie"
    )