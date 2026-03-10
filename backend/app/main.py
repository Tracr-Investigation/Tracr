from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.dependencies import limiter
from app.routes import auth, admin, investigations, tasks
from app.routes import notifications
from socketio import ASGIApp as SocketASGIApp
from app.socketio_server import sio

fastapi_app = FastAPI()
fastapi_app.state.limiter = limiter


@fastapi_app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many attempts. Please try again later."},
    )


fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)


@fastapi_app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    return response


fastapi_app.include_router(auth.router)
fastapi_app.include_router(admin.router)
fastapi_app.include_router(investigations.router)
fastapi_app.include_router(tasks.router)
fastapi_app.include_router(notifications.router)

app = SocketASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="socket.io")