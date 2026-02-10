from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from services import user_service, log_service
from utils.security import verify_token, create_token
from utils.schemas import LoginRequest, RegisterRequest, ChangePasswordRequest
from app.dependencies import get_db, limiter

router = APIRouter()


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else None
    user = user_service.authenticate_user(db, body.pseudo, body.password)
    if not user:
        log_service.create_log(db, "auth", "login_failed", detail=f"pseudo={body.pseudo}", ip_address=ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user.id_user)
    user_service.update_last_login(db, user)
    role = user_service.get_user_role(db, user.id_user)
    log_service.create_log(db, "auth", "login", id_user=user.id_user, ip_address=ip)

    return {
        "token": token,
        "id_user": user.id_user,
        "pseudo": user.pseudo,
        "role": role,
    }


@router.post("/register")
@limiter.limit("3/minute")
async def register(
    request: Request, body: RegisterRequest, db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else None
    existing = user_service.get_user_by_pseudo(db, body.pseudo)
    if existing:
        log_service.create_log(db, "auth", "register_failed", detail=f"pseudo={body.pseudo} already taken", ip_address=ip)
        raise HTTPException(status_code=409, detail="This username is already taken")

    try:
        user = user_service.create_user(db, body.pseudo, body.password)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="This username is already taken")

    log_service.create_log(db, "auth", "register", id_user=user.id_user, ip_address=ip)

    return {"id_user": user.id_user, "pseudo": user.pseudo, "role": "user"}


@router.get("/me")
async def get_me(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role = user_service.get_user_role(db, user.id_user)

    return {
        "id_user": user.id_user,
        "pseudo": user.pseudo,
        "role": role,
    }


@router.post("/change-password")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else None
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    if not user_service.verify_password(body.current_password, user.password_hash):
        log_service.create_log(db, "auth", "change_password_failed", id_user=user.id_user, ip_address=ip)
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user_service.update_password(db, user, body.new_password)
    log_service.create_log(db, "auth", "change_password", id_user=user.id_user, ip_address=ip)

    return {"detail": "Password changed successfully"}
