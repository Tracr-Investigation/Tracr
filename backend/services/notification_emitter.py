from typing import Optional
from sqlalchemy.orm import Session
from services import notification_service
from app.socketio_server import emit_notification


async def create_and_emit(
    db: Session,
    id_user: int,
    type: str,
    title: str,
    message: Optional[str] = None,
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
) -> dict:
    data = notification_service.create_notification(
        db,
        id_user=id_user,
        type=type,
        title=title,
        message=message,
        reference_id=reference_id,
        reference_type=reference_type,
    )
    await emit_notification(id_user, data)
    return data