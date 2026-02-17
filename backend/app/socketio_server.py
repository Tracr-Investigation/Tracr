import socketio
from jose import jwt, JWTError
from config import settings

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=["http://localhost:5173"],
)



@sio.event
async def connect(sid, environ, auth):
    if not auth or "token" not in auth:
        raise socketio.exceptions.ConnectionRefusedError("Token manquant")

    try:
        payload = jwt.decode(auth["token"], settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        raise socketio.exceptions.ConnectionRefusedError("Token invalide")

    user_id = payload.get("user_id")
    if not user_id:
        raise socketio.exceptions.ConnectionRefusedError("Token invalide")

    await sio.save_session(sid, {"user_id": user_id})
    sio.enter_room(sid, f"user_{user_id}")


@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    if user_id:
        sio.leave_room(sid, f"user_{user_id}")


async def emit_notification(user_id: int, data: dict):
    await sio.emit("new_notification", data, room=f"user_{user_id}")
