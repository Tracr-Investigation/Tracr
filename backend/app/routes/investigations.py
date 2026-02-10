from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from services import user_service, investigation_service
from utils.security import verify_token
from utils.schemas import InvestigationCreateRequest
from app.dependencies import get_db

router = APIRouter(prefix="/investigations")


def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.get("")
async def get_my_investigations(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    investigations = investigation_service.get_investigations_by_owner(db, user.id_user)
    total = investigation_service.count_investigations_by_owner(db, user.id_user)
    return {"investigations": investigations, "total": total}


@router.post("")
async def create_investigation(
    body: InvestigationCreateRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    investigation = investigation_service.create_investigation(
        db, title=body.title, owner_id=user.id_user, description=body.description
    )
    return {
        "id_investigation": investigation.id_investigation,
        "title": investigation.title,
        "description": investigation.description,
    }
