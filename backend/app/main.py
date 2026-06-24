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
from app.routes import notifications, documents, templates, geocode, entities, sources, selectors
from services import document_service, update_service
from socketio import ASGIApp as SocketASGIApp
from app.socketio_server import sio


logger = logging.getLogger("tracr.autobackup")

# Sauvegarde automatique des documents toutes les 10 minutes
AUTO_BACKUP_INTERVAL_SECONDS = 600


def _run_auto_backup_sweep() -> None:
    """Goal: run one document auto-backup sweep synchronously (called in a thread). Input: none. Output: None."""
    with Session(engine) as db:
        created = document_service.auto_backup_sweep(db)
        if created:
            logger.info("Auto-backup: %d document(s) sauvegardé(s)", created)


async def _auto_backup_loop() -> None:
    """Goal: background loop running an auto-backup sweep every 10 min. Input: none. Output: None (runs forever)."""
    while True:
        await asyncio.sleep(AUTO_BACKUP_INTERVAL_SECONDS)
        try:
            await asyncio.to_thread(_run_auto_backup_sweep)
        except Exception:
            # Un échec ponctuel ne doit pas tuer la boucle de sauvegarde
            logger.exception("Auto-backup sweep failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Goal: app lifespan — start the auto-backup loop on startup, cancel it on shutdown. Input: app (FastAPI). Output: async context (yields control)."""
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
    """Goal: handle rate-limit errors with a 429 JSON response. Input: request, exc (RateLimitExceeded). Output: JSONResponse (429)."""
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
    expose_headers=["Content-Disposition"],
)


@fastapi_app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Goal: middleware adding security headers to every response. Input: request, call_next. Output: Response (with security headers)."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    return response


@fastapi_app.get("/health")
async def health():
    """Goal: health check. Input: none. Output: {"status": "ok"}."""
    return {"status": "ok"}


@fastapi_app.get("/maintenance")
async def maintenance():
    """Goal: public state — is an update in progress? (for the maintenance page). Input: none. Output: {"active": bool}."""
    apply_state = await asyncio.to_thread(update_service.get_apply_state)
    return {"active": apply_state["status"] in ("pending", "running")}


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
fastapi_app.include_router(selectors.router)
fastapi_app.include_router(selectors.selectors_router)

app = SocketASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="socket.io")