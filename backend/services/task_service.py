from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.investigation import Investigation
from models.investigation_collaborator import InvestigationCollaborator
from models.task import Task
from models.task_response import TaskResponse
from models.user import User


def get_user_permission(db: Session, id_investigation: int, id_user: int) -> Optional[str]:
    """Retourne la permission de l'utilisateur sur l'investigation (owner/manager/editeur/lecteur ou None)."""
    investigation = db.query(Investigation).filter(Investigation.id_investigation == id_investigation).first()
    if not investigation:
        return None
    if investigation.owner_id == id_user:
        return "owner"
    collab = (
        db.query(InvestigationCollaborator)
        .filter(
            InvestigationCollaborator.id_investigation == id_investigation,
            InvestigationCollaborator.id_user == id_user,
            InvestigationCollaborator.accepted_at.isnot(None),
        )
        .first()
    )
    if collab:
        return collab.permission_level.value if hasattr(collab.permission_level, "value") else collab.permission_level
    return None


def is_member(db: Session, id_investigation: int, id_user: int) -> bool:
    """Vérifie si l'utilisateur est membre de l'investigation (owner ou collaborateur accepté)."""
    return get_user_permission(db, id_investigation, id_user) is not None


def can_create_task(permission: Optional[str]) -> bool:
    """Goal: tell if a permission level may create tasks. Input: permission. Output: bool."""
    return permission in ("owner", "manager", "editeur")


def can_edit_task(permission: Optional[str], id_user: int, task: Task) -> bool:
    """Goal: tell if a user may edit a task (owner or its creator). Input: permission, id_user, task. Output: bool."""
    return permission == "owner" or task.created_by == id_user


def can_delete_task(permission: Optional[str], id_user: int, task: Task) -> bool:
    """Goal: tell if a user may delete a task (owner or its creator). Input: permission, id_user, task. Output: bool."""
    return permission == "owner" or task.created_by == id_user


def can_change_status(permission: Optional[str], id_user: int, task: Task) -> bool:
    """Goal: tell if a user may change a task's status (owner, creator or assignee). Input: permission, id_user, task. Output: bool."""
    return permission == "owner" or task.created_by == id_user or task.assigned_to == id_user


def _column_query(db: Session, id_investigation: Optional[int], created_by: Optional[int], status: str):
    """Requête sur les tâches d'une même colonne Kanban (même scope + même statut).

    Scope = une enquête (id_investigation) pour un board d'enquête, ou les tâches
    personnelles d'un utilisateur (id_investigation NULL + created_by) pour un board perso.
    """
    q = db.query(Task).filter(Task.status == status)
    if id_investigation is None:
        q = q.filter(Task.id_investigation.is_(None), Task.created_by == created_by)
    else:
        q = q.filter(Task.id_investigation == id_investigation)
    return q


def _next_position(db: Session, id_investigation: Optional[int], created_by: Optional[int], status: str) -> int:
    """Position pour ajouter une tâche en bas d'une colonne."""
    max_pos = _column_query(db, id_investigation, created_by, status).with_entities(
        func.max(Task.position)
    ).scalar()
    return (max_pos + 1) if max_pos is not None else 0


def _task_to_dict(task: Task, db: Session) -> dict:
    """Convertit une tâche en dictionnaire enrichi."""
    creator = db.query(User).filter(User.id_user == task.created_by).first() if task.created_by else None
    assignee = db.query(User).filter(User.id_user == task.assigned_to).first() if task.assigned_to else None
    response_count = db.query(TaskResponse).filter(TaskResponse.id_task == task.id_task).count()

    return {
        "id_task": task.id_task,
        "id_investigation": task.id_investigation,
        "title": task.title,
        "description": task.description,
        "status": task.status.value if hasattr(task.status, "value") else task.status,
        "priority": task.priority.value if hasattr(task.priority, "value") else task.priority,
        "is_private": task.is_private,
        "position": task.position,
        "created_by": task.created_by,
        "created_by_pseudo": creator.pseudo if creator else None,
        "assigned_to": task.assigned_to,
        "assigned_to_pseudo": assignee.pseudo if assignee else None,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
        "response_count": response_count,
    }


def get_tasks(db: Session, id_investigation: int, id_user: int) -> list[dict]:
    """Récupère les tâches visibles par l'utilisateur."""
    investigation = db.query(Investigation).filter(Investigation.id_investigation == id_investigation).first()
    if not investigation:
        return []

    is_owner = investigation.owner_id == id_user

    if is_owner:
        tasks = (
            db.query(Task)
            .filter(Task.id_investigation == id_investigation)
            .order_by(Task.created_at.desc())
            .all()
        )
    else:
        # Les collaborateurs voient les tâches partagées + leurs propres tâches privées
        tasks = (
            db.query(Task)
            .filter(
                Task.id_investigation == id_investigation,
                (Task.is_private == False) | (Task.created_by == id_user),
            )
            .order_by(Task.created_at.desc())
            .all()
        )

    return [_task_to_dict(t, db) for t in tasks]


def get_task_by_id(db: Session, id_task: int) -> Optional[Task]:
    """Goal: fetch a task by id. Input: db, id_task. Output: Task or None."""
    return db.query(Task).filter(Task.id_task == id_task).first()


def create_task(
    db: Session,
    id_investigation: Optional[int],
    id_user: int,
    title: str,
    description: Optional[str] = None,
    status: str = "todo",
    priority: str = "normale",
    is_private: bool = False,
    assigned_to: Optional[int] = None,
    due_date: Optional[datetime] = None,
) -> dict:
    """Goal: create a task (investigation or personal) appended to its column. Input: db, id_investigation, id_user, title, description, status, priority, is_private, assigned_to, due_date. Output: the created task dict."""
    # id_investigation None => tâche personnelle (scope = créateur)
    position = _next_position(db, id_investigation, id_user, status)
    task = Task(
        id_investigation=id_investigation,
        title=title,
        description=description,
        status=status,
        priority=priority,
        is_private=is_private,
        position=position,
        created_by=id_user,
        assigned_to=assigned_to,
        due_date=due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_dict(task, db)


def move_task(db: Session, task: Task, new_status: str, new_position: int) -> dict:
    """Déplace une carte sur le Kanban : change de colonne (statut) et/ou de position,
    puis renumérote la colonne cible de façon contiguë."""
    old_status = task.status.value if hasattr(task.status, "value") else task.status

    siblings = (
        _column_query(db, task.id_investigation, task.created_by, new_status)
        .filter(Task.id_task != task.id_task)
        .order_by(Task.position.asc())
        .all()
    )

    new_position = max(0, min(new_position, len(siblings)))
    siblings.insert(new_position, task)
    for idx, sibling in enumerate(siblings):
        sibling.position = idx

    now = datetime.now(ZoneInfo("Europe/Paris"))
    if new_status != old_status:
        task.status = new_status
        task.completed_at = now if new_status == "termine" else None
    task.updated_at = now

    db.add_all(siblings)
    db.commit()
    db.refresh(task)
    return _task_to_dict(task, db)


def get_personal_tasks(db: Session, id_user: int) -> list[dict]:
    """Tâches personnelles de l'utilisateur (hors enquête), ordonnées pour le Kanban."""
    tasks = (
        db.query(Task)
        .filter(Task.id_investigation.is_(None), Task.created_by == id_user)
        .order_by(Task.position.asc(), Task.created_at.desc())
        .all()
    )
    return [_task_to_dict(t, db) for t in tasks]


def update_task(
    db: Session,
    task: Task,
    title: Optional[str] = None,
    description: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    is_private: Optional[bool] = None,
    assigned_to: Optional[int] = None,
    due_date: Optional[datetime] = None,
    clear_assigned: bool = False,
    clear_due_date: bool = False,
) -> dict:
    """Goal: update a task's fields (manages completed_at on status change). Input: db, task, title, description, status, priority, is_private, assigned_to, due_date, clear_assigned, clear_due_date. Output: the updated task dict."""
    # Capturer l'ancien statut AVANT modification
    old_status = task.status.value if hasattr(task.status, "value") else task.status

    if title is not None:
        task.title = title
    if description is not None:
        task.description = description
    if status is not None:
        task.status = status
    if priority is not None:
        task.priority = priority
    if is_private is not None:
        task.is_private = is_private
    if clear_assigned:
        task.assigned_to = None
    elif assigned_to is not None:
        task.assigned_to = assigned_to
    if clear_due_date:
        task.due_date = None
    elif due_date is not None:
        task.due_date = due_date

    now = datetime.now(ZoneInfo("Europe/Paris"))
    if status is not None and status != old_status:
        if status == "termine":
            task.completed_at = now
        else:
            task.completed_at = None
    task.updated_at = now
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_dict(task, db)


def delete_task(db: Session, task: Task) -> bool:
    """Goal: delete a task. Input: db, task. Output: True."""
    db.delete(task)
    db.commit()
    return True


def get_responses(db: Session, id_task: int) -> list[dict]:
    """Goal: list a task's responses (oldest first, with author). Input: db, id_task. Output: list of response dicts."""
    rows = (
        db.query(TaskResponse, User)
        .outerjoin(User, TaskResponse.id_user == User.id_user)
        .filter(TaskResponse.id_task == id_task)
        .order_by(TaskResponse.created_at.asc())
        .all()
    )
    return [
        {
            "id_response": resp.id_response,
            "id_task": resp.id_task,
            "id_user": resp.id_user,
            "pseudo": user.pseudo if user else None,
            "content": resp.content,
            "created_at": resp.created_at.isoformat() if resp.created_at else None,
            "updated_at": resp.updated_at.isoformat() if resp.updated_at else None,
        }
        for resp, user in rows
    ]


def create_response(db: Session, id_task: int, id_user: int, content: str) -> dict:
    """Goal: add a response/comment to a task. Input: db, id_task, id_user, content. Output: the created response dict."""
    response = TaskResponse(
        id_task=id_task,
        id_user=id_user,
        content=content,
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    user = db.query(User).filter(User.id_user == id_user).first()
    return {
        "id_response": response.id_response,
        "id_task": response.id_task,
        "id_user": response.id_user,
        "pseudo": user.pseudo if user else None,
        "content": response.content,
        "created_at": response.created_at.isoformat() if response.created_at else None,
        "updated_at": None,
    }


def get_my_tasks(
    db: Session,
    id_user: int,
    limit: Optional[int] = 10,
    include_completed: bool = False,
) -> list[dict]:
    """Tâches assignées à l'utilisateur sur toutes ses enquêtes.

    - limit=10 (défaut) : widget dashboard.
    - limit=None + include_completed=True : vue Kanban « assignées à moi » (toutes colonnes).
    """
    # Sous-requête : investigations où l'utilisateur est membre
    owned_ids = db.query(Investigation.id_investigation).filter(Investigation.owner_id == id_user)
    collab_ids = (
        db.query(InvestigationCollaborator.id_investigation)
        .filter(
            InvestigationCollaborator.id_user == id_user,
            InvestigationCollaborator.accepted_at.isnot(None),
        )
    )
    accessible_query = owned_ids.union(collab_ids)

    query = (
        db.query(Task, Investigation)
        .join(Investigation, Task.id_investigation == Investigation.id_investigation)
        .filter(
            Task.assigned_to == id_user,
            Task.id_investigation.in_(accessible_query),
            (Task.is_private == False) | (Task.created_by == id_user),
        )
    )
    if not include_completed:
        query = query.filter(Task.status != "termine")

    query = query.order_by(
        Task.due_date.asc().nullslast(),
        Task.created_at.desc(),
    )
    if limit is not None:
        query = query.limit(limit)

    result = []
    for task, investigation in query.all():
        d = _task_to_dict(task, db)
        d["investigation_title"] = investigation.title
        result.append(d)
    return result


def get_response_by_id(db: Session, id_response: int) -> Optional[TaskResponse]:
    """Goal: fetch a task response by id. Input: db, id_response. Output: TaskResponse or None."""
    return db.query(TaskResponse).filter(TaskResponse.id_response == id_response).first()


def delete_response(db: Session, response: TaskResponse) -> bool:
    """Goal: delete a task response. Input: db, response. Output: True."""
    db.delete(response)
    db.commit()
    return True
