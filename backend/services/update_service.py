"""Détection des mises à jour du code depuis GitHub (Phase 1, lecture seule).

Le backend tourne dans un conteneur qui ne monte que ``./backend`` : il n'a donc
pas accès au ``.git`` du dépôt. Le SHA du commit actuellement déployé lui est
fourni de l'extérieur :

1. par le fichier d'état partagé écrit par l'agent hôte (Phase 2), ou
2. à défaut par la variable d'environnement ``GIT_SHA``.

À partir de ce SHA, on interroge l'API publique GitHub (endpoint *compare*) pour
savoir de combien de commits le dépôt local est en retard sur ``main`` et ce qui
va changer. Aucune écriture, aucune action sur l'hôte ici.
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests

from config import settings

_GITHUB_API = "https://api.github.com"
# TTL du cache mémoire : l'API non authentifiée est limitée à 60 req/h.
_CACHE_TTL_SECONDS = 300
_HTTP_TIMEOUT = 10

# Cache process unique : { "key": str, "data": dict, "ts": float }
_cache: dict = {}


class UpdateInProgressError(Exception):
    """Une mise à jour est déjà en attente ou en cours."""


def _update_dir() -> Path:
    return Path(settings.UPDATE_STATE_FILE).parent


def _request_file() -> Path:
    return _update_dir() / "request.json"


def _read_json(path: Path) -> Optional[dict]:
    try:
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        pass
    return None


def _atomic_write(path: Path, payload: dict) -> None:
    """Écriture atomique (tmp + replace) pour éviter que l'agent lise un JSON partiel."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def _read_state() -> Optional[dict]:
    return _read_json(Path(settings.UPDATE_STATE_FILE))


def _current_sha() -> Optional[str]:
    """SHA du commit déployé : fichier d'état partagé d'abord, puis env GIT_SHA."""
    state = _read_state()
    if state:
        sha = state.get("current_sha")
        if sha:
            return str(sha).strip()

    return (settings.GIT_SHA or "").strip() or None


def _github_headers() -> dict:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Tracr-Updater",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
    return headers


def _derive_flags(files: list[dict]) -> dict:
    """Déduit les conséquences d'une mise à jour à partir des fichiers modifiés."""
    migrations = False
    deps = False
    rebuild = False

    for f in files:
        name = f.get("filename", "")
        status = f.get("status", "")

        if name.startswith("backend/alembic/versions/") and status == "added":
            migrations = True
        if name.endswith(("requirements.txt", "package.json")):
            deps = True
        if "Dockerfile" in name or "docker-compose" in name or name.endswith("requirements.txt"):
            rebuild = True

    return {"migrations": migrations, "deps": deps, "rebuild": rebuild}


def _compact_commits(commits: list[dict]) -> list[dict]:
    out = []
    for c in commits:
        commit = c.get("commit", {})
        author = commit.get("author", {}) or {}
        # Première ligne du message seulement (titre du commit).
        message = (commit.get("message") or "").splitlines()[0] if commit.get("message") else ""
        out.append({
            "sha": c.get("sha", "")[:7],
            "message": message,
            "author": author.get("name"),
            "date": author.get("date"),
            "url": c.get("html_url"),
        })
    return out


def _fetch_status(current_sha: Optional[str]) -> dict:
    repo = settings.GITHUB_REPO
    branch = settings.GITHUB_BRANCH
    base = {
        "repo": repo,
        "branch": branch,
        "current_sha": current_sha[:7] if current_sha else None,
        "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    try:
        if current_sha:
            resp = requests.get(
                f"{_GITHUB_API}/repos/{repo}/compare/{current_sha}...{branch}",
                headers=_github_headers(), timeout=_HTTP_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
            ahead_by = data.get("ahead_by", 0)
            return {
                **base,
                "known": True,
                "up_to_date": ahead_by == 0,
                "ahead_by": ahead_by,
                "behind_by": data.get("behind_by", 0),
                "latest_sha": (data.get("commits") or [{}])[-1].get("sha", "")[:7] or None,
                "commits": _compact_commits(data.get("commits", [])),
                "flags": _derive_flags(data.get("files", [])),
                "compare_url": data.get("html_url"),
                "error": None,
            }

        # SHA local inconnu : on remonte juste le dernier commit de la branche.
        resp = requests.get(
            f"{_GITHUB_API}/repos/{repo}/commits/{branch}",
            headers=_github_headers(), timeout=_HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            **base,
            "known": False,
            "up_to_date": None,
            "ahead_by": None,
            "behind_by": None,
            "latest_sha": data.get("sha", "")[:7] or None,
            "commits": _compact_commits([data]),
            "flags": {"migrations": False, "deps": False, "rebuild": False},
            "compare_url": data.get("html_url"),
            "error": "current_sha_unknown",
        }
    except requests.RequestException as exc:
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        error = "rate_limited" if status_code == 403 else "github_unreachable"
        return {
            **base,
            "known": current_sha is not None,
            "up_to_date": None,
            "ahead_by": None,
            "behind_by": None,
            "latest_sha": None,
            "commits": [],
            "flags": {"migrations": False, "deps": False, "rebuild": False},
            "compare_url": None,
            "error": error,
        }


def get_update_status(force: bool = False) -> dict:
    """Statut de mise à jour, mis en cache ``_CACHE_TTL_SECONDS`` pour ménager l'API.

    ``force=True`` ignore le cache (rafraîchissement manuel depuis l'UI).
    """
    current_sha = _current_sha()
    cache_key = current_sha or "__unknown__"

    if not force and _cache.get("key") == cache_key:
        if time.time() - _cache.get("ts", 0) < _CACHE_TTL_SECONDS:
            # L'état d'application (fichiers locaux) est toujours recalculé, hors cache.
            return {**_cache["data"], "apply": get_apply_state(), "cached": True}

    data = _fetch_status(current_sha)
    # On ne met en cache que les réponses exploitables (pas les erreurs réseau).
    if data.get("error") in (None, "current_sha_unknown"):
        _cache.update({"key": cache_key, "data": data, "ts": time.time()})
    return {**data, "apply": get_apply_state(), "cached": False}


# --- Application de la mise à jour (Phase 2) ---------------------------------
# Le backend ne fait qu'écrire une demande (request.json) ; l'agent hôte exécute
# le git pull / rebuild / migrate et tient state.json à jour. Le backend ne
# reçoit jamais de privilège hôte.

def get_apply_state() -> dict:
    """État de l'application de mise à jour, fusionnant state.json et request.json."""
    state = _read_state() or {}
    request = _read_json(_request_file())
    raw_status = state.get("status", "idle")

    # request.json présent et l'agent n'a pas encore démarré → en file d'attente.
    if request and raw_status != "running":
        return {
            "status": "pending",
            "message": None,
            "target_sha": (request.get("target_sha") or "")[:7] or None,
            "requested_by": request.get("requested_by_pseudo"),
            "requested_at": request.get("requested_at"),
            "started_at": None,
            "finished_at": None,
            "log_tail": None,
        }

    return {
        "status": raw_status,
        "message": state.get("message"),
        "target_sha": (state.get("target_sha") or "")[:7] or None,
        "requested_by": None,
        "requested_at": None,
        "started_at": state.get("started_at"),
        "finished_at": state.get("finished_at"),
        "log_tail": state.get("log_tail"),
    }


def _backups_dir() -> Path:
    return _update_dir() / "backups"


def list_backups() -> list[dict]:
    """Liste les dumps SQL présents, du plus récent au plus ancien."""
    d = _backups_dir()
    if not d.is_dir():
        return []
    items = []
    for f in d.glob("*.sql"):
        try:
            st = f.stat()
        except OSError:
            continue
        items.append({
            "name": f.name,
            "size_bytes": st.st_size,
            "created_at": datetime.fromtimestamp(st.st_mtime, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })
    items.sort(key=lambda b: b["name"], reverse=True)
    return items


def backup_path(name: str) -> Optional[Path]:
    """Chemin d'un backup, validé contre le path-traversal. None si invalide/absent."""
    if not name or name != Path(name).name or not name.endswith(".sql"):
        return None
    p = _backups_dir() / name
    return p if p.is_file() else None


def delete_backup(name: str) -> bool:
    p = backup_path(name)
    if not p:
        return False
    p.unlink()
    return True


def request_apply(user_id: int, pseudo: str, target_sha: str) -> dict:
    """Écrit la demande de mise à jour. Lève UpdateInProgressError si déjà en cours."""
    current = get_apply_state()
    if current["status"] in ("pending", "running"):
        raise UpdateInProgressError()

    _atomic_write(_request_file(), {
        "requested_by": user_id,
        "requested_by_pseudo": pseudo,
        "target_sha": target_sha,
        "requested_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    })
    return get_apply_state()
