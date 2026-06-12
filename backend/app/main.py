from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.dependencies import limiter
from app.routes import auth, admin, investigations, tasks
from app.routes import notifications, documents, templates, geocode, entities, sources
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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    # Autorise l'extension navigateur (Chrome / Firefox) a appeler l'API
    allow_origin_regex=r"^(chrome-extension|moz-extension)://.*$",
    allow_methods=["*"],
    allow_headers=["*"],
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


@fastapi_app.get("/health")
async def health():
    return {"status": "ok"}


fastapi_app.include_router(auth.router)
fastapi_app.include_router(admin.router)
fastapi_app.include_router(investigations.router)
fastapi_app.include_router(tasks.router)
fastapi_app.include_router(tasks.me_router)
fastapi_app.include_router(notifications.router)
fastapi_app.include_router(documents.router)
fastapi_app.include_router(documents.docs_router)
fastapi_app.include_router(templates.router)
fastapi_app.include_router(geocode.router)
fastapi_app.include_router(entities.router)
fastapi_app.include_router(sources.router)
fastapi_app.include_router(sources.sources_router)

app = SocketASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="socket.io")