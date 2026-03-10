from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from services import investigation_service, log_service, user_service
from services import task_service
from services.notification_emitter import create_and_emit
from utils.schemas import TaskCreateRequest, TaskResponseCreateRequest, TaskUpdateRequest
from utils.security import verify_token
from app.dependencies import get_db

router = APIRouter(prefix="/investigations")
me_router = APIRouter(prefix="/tasks")


def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _check_investigation_access(db: Session, investigation_id: int, user_id: int):
    """Vérifie que l'investigation existe et que l'utilisateur y a accès. Retourne (investigation, permission)."""
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    permission = task_service.get_user_permission(db, investigation_id, user_id)
    if permission is None:
        raise HTTPException(status_code=403, detail="Access denied")
    return investigation, permission


def _check_task_visibility(task, permission: str, user_id: int):
    """Vérifie que la tâche est visible par l'utilisateur."""
    if task.is_private and permission != "owner" and task.created_by != user_id:
        raise HTTPException(status_code=404, detail="Task not found")


@router.get("/{investigation_id}/tasks")
async def get_tasks(
    investigation_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_investigation_access(db, investigation_id, user.id_user)
    tasks = task_service.get_tasks(db, investigation_id, user.id_user)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="task", action="list_tasks",
        id_user=user.id_user, detail=f"Investigation #{investigation_id}",
        ip_address=ip,
    )
    return {"tasks": tasks}


@router.post("/{investigation_id}/tasks")
async def create_task(
    investigation_id: int,
    body: TaskCreateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    investigation, permission = _check_investigation_access(db, investigation_id, user.id_user)

    if not task_service.can_create_task(permission):
        raise HTTPException(status_code=403, detail="Insufficient permissions to create tasks")

    if body.assigned_to is not None:
        if not task_service.is_member(db, investigation_id, body.assigned_to):
            raise HTTPException(status_code=400, detail="Assigned user is not a member of this investigation")

    task = task_service.create_task(
        db,
        id_investigation=investigation_id,
        id_user=user.id_user,
        title=body.title,
        description=body.description,
        status=body.status,
        priority=body.priority,
        is_private=body.is_private,
        assigned_to=body.assigned_to,
        due_date=body.due_date,
    )

    # Notification si tâche partagée et assignée à quelqu'un d'autre
    if not body.is_private and body.assigned_to and body.assigned_to != user.id_user:
        await create_and_emit(
            db,
            id_user=body.assigned_to,
            type="task",
            title="Nouvelle tâche assignée",
            message=f"{user.pseudo} vous a assigné la tâche '{body.title}' sur '{investigation.title}'",
            reference_id=investigation_id,
            reference_type="task",
        )

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="task", action="create",
        id_user=user.id_user,
        detail=f"Tâche #{task['id_task']} - {body.title} (Investigation #{investigation_id})",
        ip_address=ip,
    )
    return task


@router.patch("/{investigation_id}/tasks/{task_id}")
async def update_task(
    investigation_id: int,
    task_id: int,
    body: TaskUpdateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    investigation, permission = _check_investigation_access(db, investigation_id, user.id_user)

    task = task_service.get_task_by_id(db, task_id)
    if not task or task.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Task not found")

    _check_task_visibility(task, permission, user.id_user)

    if not task_service.can_edit_task(permission, user.id_user, task):
        raise HTTPException(status_code=403, detail="Insufficient permissions to edit this task")

    if body.assigned_to is not None:
        if not task_service.is_member(db, investigation_id, body.assigned_to):
            raise HTTPException(status_code=400, detail="Assigned user is not a member of this investigation")

    old_assigned = task.assigned_to

    updated = task_service.update_task(
        db, task,
        title=body.title,
        description=body.description,
        status=body.status,
        priority=body.priority,
        is_private=body.is_private,
        assigned_to=body.assigned_to,
        due_date=body.due_date,
        clear_assigned=body.clear_assigned,
        clear_due_date=body.clear_due_date,
    )

    # Notification si nouvelle assignation sur une tâche partagée
    new_assigned = updated.get("assigned_to")
    if (
        not updated.get("is_private")
        and new_assigned
        and new_assigned != old_assigned
        and new_assigned != user.id_user
    ):
        await create_and_emit(
            db,
            id_user=new_assigned,
            type="task",
            title="Tâche assignée",
            message=f"{user.pseudo} vous a assigné la tâche '{updated['title']}' sur '{investigation.title}'",
            reference_id=investigation_id,
            reference_type="task",
        )

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="task", action="update",
        id_user=user.id_user,
        detail=f"Tâche #{task_id} modifiée (Investigation #{investigation_id})",
        ip_address=ip,
    )
    return updated


@router.delete("/{investigation_id}/tasks/{task_id}")
async def delete_task(
    investigation_id: int,
    task_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_investigation_access(db, investigation_id, user.id_user)

    task = task_service.get_task_by_id(db, task_id)
    if not task or task.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Task not found")

    permission = task_service.get_user_permission(db, investigation_id, user.id_user)
    _check_task_visibility(task, permission, user.id_user)

    if not task_service.can_delete_task(permission, user.id_user, task):
        raise HTTPException(status_code=403, detail="Insufficient permissions to delete this task")

    title = task.title
    task_service.delete_task(db, task)

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="task", action="delete",
        id_user=user.id_user,
        detail=f"Tâche #{task_id} - {title} supprimée (Investigation #{investigation_id})",
        ip_address=ip,
    )
    return {"detail": "Task deleted"}


@router.get("/{investigation_id}/tasks/{task_id}/responses")
async def get_task_responses(
    investigation_id: int,
    task_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, permission = _check_investigation_access(db, investigation_id, user.id_user)

    task = task_service.get_task_by_id(db, task_id)
    if not task or task.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Task not found")

    _check_task_visibility(task, permission, user.id_user)

    responses = task_service.get_responses(db, task_id)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="task", action="list_responses",
        id_user=user.id_user, detail=f"Tâche #{task_id}",
        ip_address=ip,
    )
    return {"responses": responses}


@router.post("/{investigation_id}/tasks/{task_id}/responses")
async def create_task_response(
    investigation_id: int,
    task_id: int,
    body: TaskResponseCreateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, permission = _check_investigation_access(db, investigation_id, user.id_user)

    task = task_service.get_task_by_id(db, task_id)
    if not task or task.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Task not found")

    _check_task_visibility(task, permission, user.id_user)

    response = task_service.create_response(db, task_id, user.id_user, body.content)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="task", action="add_response",
        id_user=user.id_user,
        detail=f"Réponse #{response['id_response']} sur tâche #{task_id}",
        ip_address=ip,
    )
    return response


@router.delete("/{investigation_id}/tasks/{task_id}/responses/{response_id}")
async def delete_task_response(
    investigation_id: int,
    task_id: int,
    response_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, permission = _check_investigation_access(db, investigation_id, user.id_user)

    task = task_service.get_task_by_id(db, task_id)
    if not task or task.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Task not found")

    _check_task_visibility(task, permission, user.id_user)

    response = task_service.get_response_by_id(db, response_id)
    if not response or response.id_task != task_id:
        raise HTTPException(status_code=404, detail="Response not found")

    is_owner_investigation = permission == "owner"
    if response.id_user != user.id_user and not is_owner_investigation:
        raise HTTPException(status_code=403, detail="Only the author or investigation owner can delete this response")

    task_service.delete_response(db, response)

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="task", action="delete_response",
        id_user=user.id_user,
        detail=f"Réponse #{response_id} supprimée (tâche #{task_id})",
        ip_address=ip,
    )
    return {"detail": "Response deleted"}


@me_router.get("/me")
async def get_my_tasks(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tasks = task_service.get_my_tasks(db, user.id_user)
    return {"tasks": tasks}
