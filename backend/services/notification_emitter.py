import asyncio
from typing import Optional
from sqlalchemy.orm import Session
from services import notification_service
from app.socketio_server import emit_notification


def create_and_emit(
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
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(emit_notification(id_user, data))
        else:
            loop.run_until_complete(emit_notification(id_user, data))
    except RuntimeError:
        pass
    return data
