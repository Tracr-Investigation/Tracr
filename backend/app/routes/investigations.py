from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session

from services import user_service, investigation_service, log_service, status_service, collaborator_service, category_service
from services.notification_emitter import create_and_emit
from utils.security import verify_token
from utils.schemas import InvestigationCreateRequest, InvestigationUpdateRequest, InvestigationTransferRequest, CollaboratorInviteRequest, CollaboratorUpdateRequest
from app.dependencies import get_db

router = APIRouter(prefix="/investigations")


def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.get("")
async def get_my_investigations(
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigations = investigation_service.get_investigations_for_user(db, user.id_user)
    total = investigation_service.count_investigations_for_user(db, user.id_user)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="list_investigations",
        id_user=user.id_user, ip_address=ip,
    )
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
        id_investigation=investigation.id_investigation,
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
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    statuses = status_service.get_all_statuses(db)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="list_statuses",
        id_user=user.id_user, ip_address=ip,
    )
    return {"statuses": statuses}


@router.get("/me/invitations")
async def get_my_invitations(
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    invitations = collaborator_service.get_pending_invitations_for_user(db, user.id_user)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="list_pending_invitations",
        id_user=user.id_user, ip_address=ip,
    )
    return {"invitations": invitations}


@router.get("/users/search")
async def search_users_for_invitation(
        request: Request,
        q: str = Query(min_length=2, max_length=50),
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    from models.user import User as UserModel
    users = (
        db.query(UserModel)
        .filter(
            UserModel.pseudo.ilike(f"%{q}%"),
            UserModel.id_user != user.id_user,
            UserModel.is_active == True,
        )
        .limit(10)
        .all()
    )
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="search_users",
        id_user=user.id_user, detail=f"q={q}", ip_address=ip,
    )
    return {
        "users": [
            {"id_user": u.id_user, "pseudo": u.pseudo}
            for u in users
        ]
    }


@router.post("/invitations/{id_collaborator}/accept")
async def accept_invitation(
        id_collaborator: int,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    result = collaborator_service.accept_invitation(db, id_collaborator, user.id_user)
    if not result:
        raise HTTPException(status_code=404, detail="Invitation not found or already accepted")

    investigation = investigation_service.get_investigation_by_id(db, result["id_investigation"])
    if investigation:
        await create_and_emit(
            db,
            id_user=investigation.owner_id,
            type="invitation",
            title="Invitation accepted",
            message=f"{user.pseudo} accepted the invitation on '{investigation.title}'",
            reference_id=investigation.id_investigation,
            reference_type="investigation",
        )

    ip = request.client.host if request.client else None
    log_service.create_log(
        db,
        category="collaboration",
        action="accept_invitation",
        id_user=user.id_user,
        id_investigation=result["id_investigation"],
        detail=f"Invitation #{id_collaborator} accepted - Investigation #{result['id_investigation']}",
        ip_address=ip,
    )
    return {"detail": "Invitation accepted", **result}


@router.post("/invitations/{id_collaborator}/reject")
async def reject_invitation(
        id_collaborator: int,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    collab = collaborator_service.get_collaborator_by_id(db, id_collaborator)
    if not collab or collab.id_user != user.id_user:
        raise HTTPException(status_code=404, detail="Invitation not found")

    success = collaborator_service.reject_invitation(db, id_collaborator, user.id_user)
    if not success:
        raise HTTPException(status_code=404, detail="Invitation not found or already accepted")

    ip = request.client.host if request.client else None
    log_service.create_log(
        db,
        category="collaboration",
        action="reject_invitation",
        id_user=user.id_user,
        detail=f"Invitation #{id_collaborator} rejected - Investigation #{collab.id_investigation}",
        ip_address=ip,
    )
    return {"detail": "Invitation rejected"}


# --- Categories ---


@router.get("/categories")
async def get_investigation_categories(
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    categories = category_service.get_all_categories(db)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="list_categories",
        id_user=user.id_user, ip_address=ip,
    )
    return {"categories": categories}


@router.get("/recent")
async def get_recent_investigations(
        request: Request,
        limit: int = 8,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigation_ids = log_service.get_recent_investigation_ids(db, user.id_user, limit)
    if not investigation_ids:
        return {"investigations": []}

    investigations = []
    for inv_id in investigation_ids:
        detail = investigation_service.get_investigation_detail(db, inv_id, current_user_id=user.id_user)
        if detail:
            detail["is_owner"] = detail["owner"]["id_user"] == user.id_user
            investigations.append(detail)

    return {"investigations": investigations}


# --- Routes with path params ---


@router.get("/{investigation_id}")
async def get_investigation(
        investigation_id: int,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    detail = investigation_service.get_investigation_detail(db, investigation_id, current_user_id=user.id_user)
    if not detail:
        raise HTTPException(status_code=404, detail="Investigation not found")

    is_owner = detail["owner"]["id_user"] == user.id_user
    collab_permission = collaborator_service.get_collaborator_permission(db, investigation_id, user.id_user)

    if not is_owner and not collab_permission:
        raise HTTPException(status_code=403, detail="Access denied")

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="view_investigation",
        id_user=user.id_user, detail=f"Investigation #{investigation_id}",
        ip_address=ip,
    )
    return detail


@router.patch("/{investigation_id}")
async def update_investigation(
        investigation_id: int,
        body: InvestigationUpdateRequest,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    if investigation.owner_id != user.id_user:
        raise HTTPException(status_code=403, detail="Only the owner can update this investigation")

    if body.title is None and body.description is None:
        raise HTTPException(status_code=422, detail="At least one field (title or description) is required")

    updated = investigation_service.update_investigation(
        db, investigation, title=body.title, description=body.description
    )

    ip = request.client.host if request.client else None
    log_service.create_log(
        db,
        category="investigation",
        action="update",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Investigation #{investigation_id} updated",
        ip_address=ip,
    )

    return {
        "id_investigation": updated.id_investigation,
        "title": updated.title,
        "description": updated.description,
    }


@router.post("/{investigation_id}/transfer")
async def transfer_investigation(
        investigation_id: int,
        body: InvestigationTransferRequest,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    if investigation.owner_id != user.id_user:
        raise HTTPException(status_code=403, detail="Only the owner can transfer ownership")

    new_owner = user_service.get_user_by_pseudo(db, body.new_owner_pseudo)
    if not new_owner or not new_owner.is_active:
        raise HTTPException(status_code=404, detail="User not found")

    if new_owner.id_user == investigation.owner_id:
        raise HTTPException(status_code=400, detail="This user is already the owner")

    # If the new owner is a collaborator, remove their collaborator entry
    from models.investigation_collaborator import InvestigationCollaborator
    existing_collab = (
        db.query(InvestigationCollaborator)
        .filter(
            InvestigationCollaborator.id_investigation == investigation_id,
            InvestigationCollaborator.id_user == new_owner.id_user,
        )
        .first()
    )
    if existing_collab:
        db.delete(existing_collab)
        db.commit()

    title = investigation.title
    investigation_service.transfer_ownership(db, investigation, new_owner.id_user)

    await create_and_emit(
        db,
        id_user=new_owner.id_user,
        type="investigation",
        title="Ownership received",
        message=f"{user.pseudo} transferred ownership of '{title}' to you",
        reference_id=investigation_id,
        reference_type="investigation",
    )

    ip = request.client.host if request.client else None
    log_service.create_log(
        db,
        category="investigation",
        action="transfer_ownership",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Investigation #{investigation_id} transferred to {body.new_owner_pseudo}",
        ip_address=ip,
    )

    return {"detail": "Ownership transferred", "new_owner": body.new_owner_pseudo}


@router.delete("/{investigation_id}")
async def delete_investigation(
        investigation_id: int,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    if investigation.owner_id != user.id_user:
        raise HTTPException(status_code=403, detail="Only the owner can delete this investigation")

    title = investigation.title
    investigation_service.delete_investigation(db, investigation_id)

    ip = request.client.host if request.client else None
    log_service.create_log(
        db,
        category="investigation",
        action="delete",
        id_user=user.id_user,
        detail=f"Investigation #{investigation_id} - {title} deleted",
        ip_address=ip,
    )

    return {"detail": "Investigation deleted"}


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

    is_owner = investigation.owner_id == user.id_user
    collab_permission = collaborator_service.get_collaborator_permission(db, investigation_id, user.id_user)

    if not is_owner and collab_permission not in ("manager", "editeur"):
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
        id_investigation=investigation_id,
        detail=f"Investigation #{investigation_id} : {old_status_name} → {new_status.name}",
        ip_address=ip,
    )

    return {"detail": "Status updated", "id_status": new_status_id, "status_name": new_status.name}


@router.post("/{investigation_id}/collaborators")
async def invite_collaborator(
        investigation_id: int,
        body: CollaboratorInviteRequest,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    is_owner = investigation.owner_id == user.id_user
    collab_permission = collaborator_service.get_collaborator_permission(db, investigation_id, user.id_user)

    if not is_owner and collab_permission != "manager":
        raise HTTPException(status_code=403, detail="Only the owner or a manager can invite")

    if collab_permission == "manager" and body.permission_level.value == "manager":
        raise HTTPException(status_code=403, detail="A manager cannot invite another manager")

    target_user = user_service.get_user_by_pseudo(db, body.pseudo)
    if not target_user or not target_user.is_active:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.id_user == user.id_user:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")

    if target_user.id_user == investigation.owner_id:
        raise HTTPException(status_code=400, detail="The owner cannot be invited as a collaborator")

    existing_collab = (
        db.query(collaborator_service.InvestigationCollaborator)
        .filter(
            collaborator_service.InvestigationCollaborator.id_investigation == investigation_id,
            collaborator_service.InvestigationCollaborator.id_user == target_user.id_user,
        )
        .first()
    )
    if existing_collab:
        raise HTTPException(status_code=409, detail="This user is already invited or a collaborator")

    result = collaborator_service.invite_collaborator(
        db,
        id_investigation=investigation_id,
        id_user=target_user.id_user,
        permission_level=body.permission_level.value,
        invited_by=user.id_user,
    )

    await create_and_emit(
        db,
        id_user=target_user.id_user,
        type="invitation",
        title="New invitation",
        message=f"{user.pseudo} invited you to '{investigation.title}' as {body.permission_level.value}",
        reference_id=investigation_id,
        reference_type="collaboration",
    )

    ip = request.client.host if request.client else None
    log_service.create_log(
        db,
        category="collaboration",
        action="invite",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Invited {body.pseudo} on Investigation #{investigation_id} ({body.permission_level.value})",
        ip_address=ip,
    )

    return result


@router.get("/{investigation_id}/collaborators")
async def get_collaborators(
        investigation_id: int,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    is_owner = investigation.owner_id == user.id_user
    collab_permission = collaborator_service.get_collaborator_permission(db, investigation_id, user.id_user)

    if not is_owner and not collab_permission:
        raise HTTPException(status_code=403, detail="Access denied")

    collaborators = collaborator_service.get_collaborators_for_investigation(db, investigation_id)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="list_collaborators",
        id_user=user.id_user, detail=f"Investigation #{investigation_id}",
        ip_address=ip,
    )
    return {"collaborators": collaborators}


@router.patch("/{investigation_id}/collaborators/{id_collaborator}")
async def update_collaborator_permission(
        investigation_id: int,
        id_collaborator: int,
        body: CollaboratorUpdateRequest,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    if investigation.owner_id != user.id_user:
        raise HTTPException(status_code=403, detail="Only the owner can modify permissions")

    result = collaborator_service.update_permission(
        db, id_collaborator, investigation_id, body.permission_level.value
    )
    if not result:
        raise HTTPException(status_code=404, detail="Collaborator not found")

    ip = request.client.host if request.client else None
    log_service.create_log(
        db,
        category="collaboration",
        action="update_permission",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Collaborator #{id_collaborator} permission -> {body.permission_level.value} (Investigation #{investigation_id})",
        ip_address=ip,
    )

    return result


@router.delete("/{investigation_id}/collaborators/{id_collaborator}")
async def remove_collaborator(
        investigation_id: int,
        id_collaborator: int,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    collab = collaborator_service.get_collaborator_by_id(db, id_collaborator)
    if not collab or collab.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Collaborator not found")

    is_owner = investigation.owner_id == user.id_user
    user_permission = collaborator_service.get_collaborator_permission(db, investigation_id, user.id_user)

    is_self_removal = collab.id_user == user.id_user

    if is_self_removal:
        pass
    elif is_owner:
        pass
    elif user_permission == "manager":
        target_perm = collab.permission_level.value if hasattr(collab.permission_level,
                                                               "value") else collab.permission_level
        if target_perm == "manager":
            raise HTTPException(status_code=403, detail="A manager cannot remove another manager")
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    success = collaborator_service.remove_collaborator(db, id_collaborator, investigation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Collaborator not found")

    ip = request.client.host if request.client else None
    log_service.create_log(
        db,
        category="collaboration",
        action="remove" if not is_self_removal else "self_remove",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Collaborator #{id_collaborator} removed from Investigation #{investigation_id}",
        ip_address=ip,
    )

    return {"detail": "Collaborator removed"}


# --- Investigation categories ---


@router.get("/{investigation_id}/categories")
async def get_investigation_category_list(
        investigation_id: int,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    is_owner = investigation.owner_id == user.id_user
    collab_permission = collaborator_service.get_collaborator_permission(db, investigation_id, user.id_user)
    if not is_owner and not collab_permission:
        raise HTTPException(status_code=403, detail="Access denied")

    categories = category_service.get_categories_for_investigation(db, investigation_id)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="consultation", action="list_investigation_categories",
        id_user=user.id_user, detail=f"Investigation #{investigation_id}",
        ip_address=ip,
    )
    return {"categories": categories}


@router.post("/{investigation_id}/categories")
async def add_category_to_investigation(
        investigation_id: int,
        body: dict,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    is_owner = investigation.owner_id == user.id_user
    collab_permission = collaborator_service.get_collaborator_permission(db, investigation_id, user.id_user)
    if not is_owner and collab_permission not in ("manager", "editeur"):
        raise HTTPException(status_code=403, detail="Access denied")

    category_id = body.get("id_category")
    if not category_id:
        raise HTTPException(status_code=422, detail="id_category is required")

    cat = category_service.get_category_by_id(db, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    result = category_service.add_category_to_investigation(db, investigation_id, category_id)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="category", action="assign", id_user=user.id_user,
        detail=f"Category '{cat.name}' added to Investigation #{investigation_id}",
        ip_address=ip,
    )
    return result


@router.delete("/{investigation_id}/categories/{category_id}")
async def remove_category_from_investigation(
        investigation_id: int,
        category_id: int,
        request: Request,
        user=Depends(get_current_user),
        db: Session = Depends(get_db),
):
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    is_owner = investigation.owner_id == user.id_user
    collab_permission = collaborator_service.get_collaborator_permission(db, investigation_id, user.id_user)
    if not is_owner and collab_permission not in ("manager", "editeur"):
        raise HTTPException(status_code=403, detail="Access denied")

    cat = category_service.get_category_by_id(db, category_id)
    cat_name = cat.name if cat else f"#{category_id}"

    success = category_service.remove_category_from_investigation(db, investigation_id, category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Category not assigned to this investigation")

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="category", action="unassign", id_user=user.id_user,
        detail=f"Category '{cat_name}' removed from Investigation #{investigation_id}",
        ip_address=ip,
    )
    return {"detail": "Category removed"}
