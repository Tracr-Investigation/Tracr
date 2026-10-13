from uuid import UUID
import socketio
from fastapi.encoders import jsonable_encoder
from jose import jwt, JWTError
from config import settings
from utils.security import SESSION_SCOPE, user_id_from_payload

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
)



@sio.event
async def connect(sid, environ, auth):
    """Goal: authenticate the Socket.IO client via JWT and join its user room. Input: sid, environ, auth (with token). Output: None (refuses connection if invalid)."""
    if not auth or "token" not in auth:
        raise socketio.exceptions.ConnectionRefusedError("Token manquant")

    try:
        payload = jwt.decode(auth["token"], settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        raise socketio.exceptions.ConnectionRefusedError("Token invalide")

    user_id = user_id_from_payload(payload, SESSION_SCOPE)
    if user_id is None:
        raise socketio.exceptions.ConnectionRefusedError("Token invalide")

    await sio.enter_room(sid, f"user_{user_id}")
    await sio.save_session(sid, {"user_id": str(user_id)})


@sio.event
async def disconnect(sid):
    """Goal: leave the user room on disconnect. Input: sid. Output: None."""
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    if user_id:
        await sio.leave_room(sid, f"user_{user_id}")


async def emit_notification(user_id: UUID, data: dict):
    """Goal: push a real-time notification to a user's room. Input: user_id, data (dict). Output: None."""
    # jsonable_encoder : les UUID/dates du dict ne sont pas serialisables tels quels
    await sio.emit("new_notification", jsonable_encoder(data), room=f"user_{user_id}")
