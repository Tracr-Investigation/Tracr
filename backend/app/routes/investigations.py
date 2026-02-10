from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from services import user_service, investigation_service, log_service, status_service
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
    request: Request,
    body: InvestigationCreateRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else None
    investigation = investigation_service.create_investigation(
        db, title=body.title, owner_id=user.id_user, description=body.description
    )
    log_service.create_log(
        db,
        category="investigation",
        action="create",
        id_user=user.id_user,
        detail=f"Investigation #{investigation.id_investigation} - {investigation.title}",
        ip_address=ip,
    )
    return {
        "id_investigation": investigation.id_investigation,
        "title": investigation.title,
        "description": investigation.description,
    }


@router.get("/statuses")
async def get_statuses(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    statuses = status_service.get_all_statuses(db)
    return {"statuses": statuses}


@router.patch("/{investigation_id}/status")
async def update_investigation_status(
    investigation_id: int,
    body: dict,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    if investigation.owner_id != user.id_user:
        raise HTTPException(status_code=403, detail="Access denied")

    new_status_id = body.get("id_status")
    if not new_status_id:
        raise HTTPException(status_code=422, detail="id_status is required")

    new_status = status_service.get_status_by_id(db, new_status_id)
    if not new_status:
        raise HTTPException(status_code=404, detail="Status not found")

    old_status_name = None
    old_status = status_service.get_status_by_id(db, investigation.id_status)
    if old_status:
        old_status_name = old_status.name

    investigation_service.update_investigation_status(db, investigation, new_status_id)

    ip = request.client.host if request.client else None
    log_service.create_log(
        db,
        category="investigation",
        action="status_change",
        id_user=user.id_user,
        detail=f"Investigation #{investigation_id} : {old_status_name} → {new_status.name}",
        ip_address=ip,
    )

    return {"detail": "Status updated", "id_status": new_status_id, "status_name": new_status.name}
