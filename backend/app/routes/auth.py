from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from services import user_service, log_service
from utils.security import verify_token, create_token
from utils.schemas import LoginRequest, RegisterRequest, ChangePasswordRequest, DeleteAccountRequest, UpdateLanguageRequest, ForceChangePasswordRequest, GenerateRecoveryRequest, RecoverPasswordRequest
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
        "language": user.language,
        "must_change_password": user.must_change_password,
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
        user, recovery_words = user_service.create_user(db, body.pseudo, body.password)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="This username is already taken")

    token = create_token(user.id_user)
    log_service.create_log(db, "auth", "register", id_user=user.id_user, ip_address=ip)
    log_service.create_log(db, "auth", "generate_recovery", id_user=user.id_user, ip_address=ip)

    return {
        "id_user": user.id_user,
        "pseudo": user.pseudo,
        "role": "user",
        "token": token,
        "language": "en",
        "recovery_words": recovery_words,
    }


@router.get("/me")
async def get_me(request: Request, payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role = user_service.get_user_role(db, user.id_user)

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="check_session",
        id_user=user.id_user, ip_address=ip,
    )

    return {
        "id_user": user.id_user,
        "pseudo": user.pseudo,
        "role": role,
        "language": user.language,
    }


@router.patch("/me/language")
async def update_language(
    body: UpdateLanguageRequest,
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    user_service.update_language(db, user, body.language)
    return {"language": user.language}


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


@router.post("/force-change-password")
async def force_change_password(
    request: Request,
    body: ForceChangePasswordRequest,
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else None
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.must_change_password:
        raise HTTPException(status_code=400, detail="Password change not required")

    user_service.update_password(db, user, body.new_password)
    log_service.create_log(db, "auth", "force_change_password", id_user=user.id_user, ip_address=ip)

    return {"detail": "Password changed successfully"}


@router.post("/generate-recovery")
async def generate_recovery(
    request: Request,
    body: GenerateRecoveryRequest,
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else None
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    if user.recovery_hash:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password required to regenerate recovery code")
        if not user_service.verify_password(body.current_password, user.password_hash):
            log_service.create_log(db, "auth", "generate_recovery_failed", id_user=user.id_user, ip_address=ip)
            raise HTTPException(status_code=400, detail="Incorrect password")

    words = user_service.generate_recovery_code(db, user)
    log_service.create_log(db, "auth", "generate_recovery", id_user=user.id_user, ip_address=ip)

    return {"words": words}


@router.post("/recover-password")
@limiter.limit("3/minute")
async def recover_password(
    request: Request,
    body: RecoverPasswordRequest,
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else None
    user = user_service.verify_and_use_recovery(db, body.pseudo, body.recovery_phrase, body.new_password)
    if not user:
        log_service.create_log(db, "auth", "recover_password_failed", detail=f"pseudo={body.pseudo}", ip_address=ip)
        raise HTTPException(status_code=400, detail="Invalid recovery phrase")

    token = create_token(user.id_user)
    user_service.update_last_login(db, user)
    role = user_service.get_user_role(db, user.id_user)
    log_service.create_log(db, "auth", "recover_password", id_user=user.id_user, ip_address=ip)

    return {
        "token": token,
        "id_user": user.id_user,
        "pseudo": user.pseudo,
        "role": role,
        "language": user.language,
    }


@router.get("/me/recovery-status")
async def get_recovery_status(
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "has_recovery": user.recovery_hash is not None,
        "recovery_created_at": user.recovery_created_at.isoformat() if user.recovery_created_at else None,
    }


@router.post("/delete-account")
async def delete_account(
    request: Request,
    body: DeleteAccountRequest,
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else None
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    if not user_service.verify_password(body.password, user.password_hash):
        log_service.create_log(db, "auth", "delete_account_failed", id_user=user.id_user, ip_address=ip)
        raise HTTPException(status_code=400, detail="Incorrect password")

    user_service.deactivate_user(db, user)
    log_service.create_log(db, "auth", "delete_account", id_user=user.id_user, detail=f"pseudo={user.pseudo}", ip_address=ip)

    return {"detail": "Account deleted successfully"}
