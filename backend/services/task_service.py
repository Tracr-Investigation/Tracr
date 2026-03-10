from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

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
    return permission in ("owner", "manager", "editeur")


def can_edit_task(permission: Optional[str], id_user: int, task: Task) -> bool:
    return permission == "owner" or task.created_by == id_user


def can_delete_task(permission: Optional[str], id_user: int, task: Task) -> bool:
    return permission == "owner" or task.created_by == id_user


def can_change_status(permission: Optional[str], id_user: int, task: Task) -> bool:
    return permission == "owner" or task.created_by == id_user or task.assigned_to == id_user


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
        "created_by": task.created_by,
        "created_by_pseudo": creator.pseudo if creator else None,
        "assigned_to": task.assigned_to,
        "assigned_to_pseudo": assignee.pseudo if assignee else None,
        "due_date": task.due_date.isoformat() if task.due_date else None,
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
    return db.query(Task).filter(Task.id_task == id_task).first()


def create_task(
    db: Session,
    id_investigation: int,
    id_user: int,
    title: str,
    description: Optional[str] = None,
    status: str = "todo",
    priority: str = "normale",
    is_private: bool = False,
    assigned_to: Optional[int] = None,
    due_date: Optional[datetime] = None,
) -> dict:
    task = Task(
        id_investigation=id_investigation,
        title=title,
        description=description,
        status=status,
        priority=priority,
        is_private=is_private,
        created_by=id_user,
        assigned_to=assigned_to,
        due_date=due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_dict(task, db)


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
    task.updated_at = datetime.now(ZoneInfo("Europe/Paris"))
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_dict(task, db)


def delete_task(db: Session, task: Task) -> bool:
    db.delete(task)
    db.commit()
    return True


def get_responses(db: Session, id_task: int) -> list[dict]:
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


def get_response_by_id(db: Session, id_response: int) -> Optional[TaskResponse]:
    return db.query(TaskResponse).filter(TaskResponse.id_response == id_response).first()


def delete_response(db: Session, response: TaskResponse) -> bool:
    db.delete(response)
    db.commit()
    return True
