from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from services import user_service, log_service
from utils.security import verify_token, create_token, create_mfa_challenge_token, verify_mfa_challenge_token
from utils.schemas import LoginRequest, RegisterRequest, ChangePasswordRequest, DeleteAccountRequest, UpdateLanguageRequest, ForceChangePasswordRequest, GenerateRecoveryRequest, RecoverPasswordRequest, MfaEnableRequest, MfaDisableRequest, MfaLoginRequest
from app.dependencies import get_db, limiter

router = APIRouter()


def _login_success(db: Session, user, ip: str | None) -> dict:
    """Goal: emit the full access token (password + MFA validated). Input: db, user, ip. Output: session dict (token, role, language...)."""
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
        "mfa_enabled": user.mfa_enabled,
    }


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """Goal: authenticate by password; if MFA on, return an MFA challenge. Input: request, body (pseudo/password), db. Output: session dict or {"mfa_required", "mfa_token"} (401 if invalid)."""
    ip = request.client.host if request.client else None
    user = user_service.authenticate_user(db, body.pseudo, body.password)
    if not user:
        log_service.create_log(db, "auth", "login_failed", detail=f"pseudo={body.pseudo}", ip_address=ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.mfa_enabled:
        log_service.create_log(db, "auth", "login_mfa_challenge", id_user=user.id_user, ip_address=ip)
        return {"mfa_required": True, "mfa_token": create_mfa_challenge_token(user.id_user)}

    return _login_success(db, user, ip)


@router.post("/login/mfa")
@limiter.limit("5/minute")
async def login_mfa(request: Request, body: MfaLoginRequest, db: Session = Depends(get_db)):
    """Goal: complete login by validating the TOTP code. Input: request, body (mfa_token, code), db. Output: session dict (401 if invalid/expired)."""
    ip = request.client.host if request.client else None
    user_id = verify_mfa_challenge_token(body.mfa_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="MFA session expired, please log in again")

    user = user_service.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user_service.verify_mfa_login(user, body.code):
        log_service.create_log(db, "auth", "login_mfa_failed", id_user=user.id_user, ip_address=ip)
        raise HTTPException(status_code=401, detail="Invalid authentication code")

    return _login_success(db, user, ip)


@router.post("/register")
@limiter.limit("3/minute")
async def register(
    request: Request, body: RegisterRequest, db: Session = Depends(get_db)
):
    """Goal: create an account and return its token + recovery words. Input: request, body (pseudo/password), db. Output: session dict with recovery_words (409 if pseudo taken)."""
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
        "mfa_enabled": False,
    }


@router.get("/me")
async def get_me(request: Request, payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Goal: return the current session's user info. Input: request, auth, db. Output: user dict (401 if invalid)."""
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
        "mfa_enabled": user.mfa_enabled,
    }


@router.get("/me/mfa/status")
async def mfa_status(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Goal: return whether MFA is enabled for the user. Input: auth, db. Output: {"mfa_enabled"}."""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return {"mfa_enabled": user.mfa_enabled}


@router.post("/me/mfa/setup")
async def mfa_setup(
    request: Request,
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Goal: generate a new (inactive) TOTP secret and return the QR to scan. Input: request, auth, db. Output: setup data (400 if MFA already on)."""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    # Defensif : ne jamais ecraser un MFA deja actif (il faut passer par /disable).
    if user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA already enabled; disable it first")

    data = user_service.start_mfa_setup(db, user)
    ip = request.client.host if request.client else None
    log_service.create_log(db, "auth", "mfa_setup", id_user=user.id_user, ip_address=ip)
    return data


@router.post("/me/mfa/enable")
async def mfa_enable(
    request: Request,
    body: MfaEnableRequest,
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Goal: confirm enrolment — validate a first code and enable MFA. Input: request, body (code), auth, db. Output: {"mfa_enabled": True} (400 if invalid)."""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    ip = request.client.host if request.client else None
    if not user_service.confirm_mfa(db, user, body.code):
        log_service.create_log(db, "auth", "mfa_enable_failed", id_user=user.id_user, ip_address=ip)
        raise HTTPException(status_code=400, detail="Invalid authentication code")

    log_service.create_log(db, "auth", "mfa_enabled", id_user=user.id_user, ip_address=ip)
    return {"mfa_enabled": True}


@router.post("/me/mfa/disable")
async def mfa_disable(
    request: Request,
    body: MfaDisableRequest,
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Goal: reset MFA (password-verified); user must re-enrol. Input: request, body (password), auth, db. Output: {"mfa_enabled": False} (400 if wrong password)."""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    ip = request.client.host if request.client else None
    if not user_service.verify_password(body.password, user.password_hash):
        log_service.create_log(db, "auth", "mfa_disable_failed", id_user=user.id_user, ip_address=ip)
        raise HTTPException(status_code=400, detail="Incorrect password")

    user_service.disable_mfa(db, user)
    log_service.create_log(db, "auth", "mfa_disabled", id_user=user.id_user, ip_address=ip)
    return {"mfa_enabled": False}


@router.patch("/me/language")
async def update_language(
    body: UpdateLanguageRequest,
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Goal: update the user's UI language. Input: body (language), auth, db. Output: {"language"}."""
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
    """Goal: change the password after verifying the current one. Input: request, body, auth, db. Output: {"detail"} (400 if current is wrong)."""
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
    """Goal: change the password when a forced change is pending. Input: request, body, auth, db. Output: {"detail"} (400 if not required)."""
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
    """Goal: (re)generate the recovery words (password required if one exists). Input: request, body, auth, db. Output: {"words"} (400 on wrong/missing password)."""
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
    """Goal: reset the password from the recovery phrase and log in. Input: request, body (pseudo/phrase/new password), db. Output: session dict (400 if invalid phrase)."""
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
        "mfa_enabled": user.mfa_enabled,
    }


@router.get("/me/recovery-status")
async def get_recovery_status(
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Goal: report whether the user has a recovery code and when. Input: auth, db. Output: {"has_recovery", "recovery_created_at"}."""
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
    """Goal: deactivate the account after password check. Input: request, body (password), auth, db. Output: {"detail"} (400 if wrong password)."""
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
