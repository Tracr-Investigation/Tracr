import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command
from sqlmodel import Session
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.dependencies import limiter, engine
from app.routes import auth, admin, investigations, tasks
from app.routes import notifications, documents, templates, geocode, entities, sources
from services import document_service
from socketio import ASGIApp as SocketASGIApp
from app.socketio_server import sio


logger = logging.getLogger("tracr.autobackup")

# Sauvegarde automatique des documents toutes les 10 minutes
AUTO_BACKUP_INTERVAL_SECONDS = 600


def _run_auto_backup_sweep() -> None:
    """Exécution synchrone d'un balayage de backup (lancée dans un thread)."""
    with Session(engine) as db:
        created = document_service.auto_backup_sweep(db)
        if created:
            logger.info("Auto-backup: %d document(s) sauvegardé(s)", created)


async def _auto_backup_loop() -> None:
    while True:
        await asyncio.sleep(AUTO_BACKUP_INTERVAL_SECONDS)
        try:
            await asyncio.to_thread(_run_auto_backup_sweep)
        except Exception:
            # Un échec ponctuel ne doit pas tuer la boucle de sauvegarde
            logger.exception("Auto-backup sweep failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_auto_backup_loop())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


fastapi_app = FastAPI(lifespan=lifespan)
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