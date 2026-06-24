from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from services import investigation_service, log_service, user_service
from services import task_service
from services.notification_emitter import create_and_emit
from utils.schemas import (
    PersonalTaskCreateRequest,
    PersonalTaskUpdateRequest,
    TaskCreateRequest,
    TaskMoveRequest,
    TaskResponseCreateRequest,
    TaskUpdateRequest,
)
from utils.security import verify_token
from app.dependencies import get_db

router = APIRouter(prefix="/investigations")
me_router = APIRouter(prefix="/tasks")


def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Goal: resolve and validate the authenticated user from the JWT. Input: token payload, db. Output: User (401 if not found/inactive)."""
    user = user_service.get_user_by_id(db, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _check_investigation_access(db: Session, investigation_id: int, user_id: int):
    """Goal: ensure the investigation exists and the user has access. Input: db, investigation_id, user_id. Output: (investigation, permission) (403/404 on errors)."""
    investigation = investigation_service.get_investigation_by_id(db, investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    permission = task_service.get_user_permission(db, investigation_id, user_id)
    if permission is None:
        raise HTTPException(status_code=403, detail="Access denied")
    return investigation, permission


def _check_task_visibility(task, permission: str, user_id: int):
    """Goal: ensure a private task is visible to the user. Input: task, permission, user_id. Output: None (404 if hidden)."""
    if task.is_private and permission != "owner" and task.created_by != user_id:
        raise HTTPException(status_code=404, detail="Task not found")


@router.get("/{investigation_id}/tasks")
async def get_tasks(
    investigation_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: list an investigation's tasks visible to the user. Input: investigation_id, auth, db. Output: {"tasks"}."""
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
    """Goal: create a task (notifies the assignee if shared). Input: investigation_id, body, auth, db. Output: the created task (400/403 on errors)."""
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
        id_investigation=investigation_id,
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
    """Goal: update a task (notifies on new assignment). Input: investigation_id, task_id, body, auth, db. Output: the updated task (400/403/404 on errors)."""
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
        id_investigation=investigation_id,
        detail=f"Tâche #{task_id} modifiée (Investigation #{investigation_id})",
        ip_address=ip,
    )
    return updated


@router.patch("/{investigation_id}/tasks/{task_id}/move")
async def move_task(
    investigation_id: int,
    task_id: int,
    body: TaskMoveRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: Kanban move of an investigation task (column/position change). Input: investigation_id, task_id, body (status/position), auth, db. Output: the updated task (403/404 on errors)."""
    _, permission = _check_investigation_access(db, investigation_id, user.id_user)

    task = task_service.get_task_by_id(db, task_id)
    if not task or task.id_investigation != investigation_id:
        raise HTTPException(status_code=404, detail="Task not found")

    _check_task_visibility(task, permission, user.id_user)

    if not task_service.can_change_status(permission, user.id_user, task):
        raise HTTPException(status_code=403, detail="Insufficient permissions to move this task")

    updated = task_service.move_task(db, task, body.status, body.position)

    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="task", action="move",
        id_user=user.id_user,
        id_investigation=investigation_id,
        detail=f"Tâche #{task_id} → {body.status} (Investigation #{investigation_id})",
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
    """Goal: delete a task. Input: investigation_id, task_id, auth, db. Output: {"detail"} (403/404 on errors)."""
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
        id_investigation=investigation_id,
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
    """Goal: list a task's responses. Input: investigation_id, task_id, auth, db. Output: {"responses"} (403/404 on errors)."""
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
    """Goal: add a response to a task. Input: investigation_id, task_id, body (content), auth, db. Output: the created response (403/404 on errors)."""
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
    """Goal: delete a task response (author or owner). Input: investigation_id, task_id, response_id, auth, db. Output: {"detail"} (403/404 on errors)."""
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
    """Goal: list the user's tasks (created or assigned). Input: auth, db. Output: {"tasks"}."""
    tasks = task_service.get_my_tasks(db, user.id_user)
    return {"tasks": tasks}


@me_router.get("/assigned")
async def get_assigned_tasks(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: list all tasks assigned to the user (all investigations/columns) for the "assigned to me" Kanban. Input: auth, db. Output: {"tasks"}."""
    tasks = task_service.get_my_tasks(db, user.id_user, limit=None, include_completed=True)
    return {"tasks": tasks}


# --- Tâches personnelles (hors enquête, id_investigation NULL) -----------------

def _get_owned_personal_task(db: Session, task_id: int, user_id: int):
    """Goal: fetch a personal task owned by the user, else 404. Input: db, task_id, user_id. Output: the task (404 otherwise)."""
    task = task_service.get_task_by_id(db, task_id)
    if not task or task.id_investigation is not None or task.created_by != user_id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@me_router.get("/personal")
async def get_personal_tasks(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: list the user's personal tasks (no investigation). Input: auth, db. Output: {"tasks"}."""
    tasks = task_service.get_personal_tasks(db, user.id_user)
    return {"tasks": tasks}


@me_router.post("/personal")
async def create_personal_task(
    body: PersonalTaskCreateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: create a personal task (no investigation). Input: body, auth, db. Output: the created task."""
    task = task_service.create_task(
        db,
        id_investigation=None,
        id_user=user.id_user,
        title=body.title,
        description=body.description,
        status=body.status,
        priority=body.priority,
        due_date=body.due_date,
    )
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="task", action="create_personal",
        id_user=user.id_user,
        detail=f"Tâche perso #{task['id_task']} - {body.title}",
        ip_address=ip,
    )
    return task


@me_router.patch("/personal/{task_id}")
async def update_personal_task(
    task_id: int,
    body: PersonalTaskUpdateRequest,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: update a personal task. Input: task_id, body, auth, db. Output: the updated task (404 if not owned)."""
    task = _get_owned_personal_task(db, task_id, user.id_user)
    updated = task_service.update_task(
        db, task,
        title=body.title,
        description=body.description,
        status=body.status,
        priority=body.priority,
        due_date=body.due_date,
        clear_due_date=body.clear_due_date,
    )
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="task", action="update_personal",
        id_user=user.id_user,
        detail=f"Tâche perso #{task_id} modifiée",
        ip_address=ip,
    )
    return updated


@me_router.patch("/personal/{task_id}/move")
async def move_personal_task(
    task_id: int,
    body: TaskMoveRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: Kanban move of a personal task (column/position). Input: task_id, body (status/position), auth, db. Output: the updated task (404 if not owned)."""
    task = _get_owned_personal_task(db, task_id, user.id_user)
    return task_service.move_task(db, task, body.status, body.position)


@me_router.delete("/personal/{task_id}")
async def delete_personal_task(
    task_id: int,
    request: Request,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Goal: delete a personal task. Input: task_id, auth, db. Output: {"detail"} (404 if not owned)."""
    task = _get_owned_personal_task(db, task_id, user.id_user)
    title = task.title
    task_service.delete_task(db, task)
    ip = request.client.host if request.client else None
    log_service.create_log(
        db, category="task", action="delete_personal",
        id_user=user.id_user,
        detail=f"Tâche perso #{task_id} - {title} supprimée",
        ip_address=ip,
    )
    return {"detail": "Task deleted"}
