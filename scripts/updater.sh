#!/usr/bin/env sh
# Agent de mise à jour Tracr (Phase 2) — tourne SUR L'HÔTE, pas dans un conteneur.
#
# Responsabilités :
#   1. Maintenir update/state.json à jour (SHA déployé + statut).
#   2. Quand update/request.json apparaît (écrit par le backend via l'admin),
#      sauvegarder la base, faire git pull, reconstruire/redémarrer la stack,
#      puis consigner le résultat.
#
# Le conteneur backend n'a aucun privilège hôte : toute la mécanique privilégiée
# (git, docker) vit ici, côté hôte. Installé via systemd timer (~30 s).
set -eu

# Racine du dépôt = parent du dossier scripts/ contenant ce fichier.
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

UPDATE_DIR="$REPO_DIR/update"
STATE="$UPDATE_DIR/state.json"
REQUEST="$UPDATE_DIR/request.json"
BACKUP_DIR="$UPDATE_DIR/backups"
LOG="$UPDATE_DIR/updater.log"
LOCK="$UPDATE_DIR/.lock"

BRANCH="${GITHUB_BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-http://localhost:8000/health}"

# docker compose v2 (plugin) par défaut ; surchargeable via $DC.
DC="${DC:-docker compose}"

# Services à reconstruire/redémarrer. On exclut volontairement "updater" : un
# conteneur ne doit pas se recréer lui-même en plein milieu de l'opération.
SERVICES="${SERVICES:-backend websocket frontend docs}"

mkdir -p "$UPDATE_DIR" "$BACKUP_DIR"
# Le dossier d'échange doit être inscriptible par le conteneur (uid 1001) pour
# qu'il puisse y déposer request.json ; les backups restent privés.
chmod 777 "$UPDATE_DIR" 2>/dev/null || true
chmod 700 "$BACKUP_DIR" 2>/dev/null || true

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(now)] $*" >> "$LOG"; }

current_sha() { git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || echo ""; }

# write_state STATUS MESSAGE TARGET STARTED FINISHED
write_state() {
  tmp="$STATE.tmp"
  cat > "$tmp" <<EOF
{
  "current_sha": "$(current_sha)",
  "status": "$1",
  "message": "$2",
  "target_sha": "$3",
  "started_at": "$4",
  "finished_at": "$5",
  "log_tail": ""
}
EOF
  mv "$tmp" "$STATE"
}

# Empêche le chevauchement de deux exécutions (le timer peut refirer pendant un build).
exec 9>"$LOCK"
if ! flock -n 9; then
  exit 0
fi

# Pas de demande en attente : on rafraîchit simplement l'état (idle) et on sort.
if [ ! -f "$REQUEST" ]; then
  write_state "idle" "" "" "" ""
  exit 0
fi

# --- Une demande de mise à jour est présente ---------------------------------
STARTED=$(now)
TARGET=$(sed -n 's/.*"target_sha"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$REQUEST" 2>/dev/null || echo "")
log "Demande de mise à jour reçue (cible: ${TARGET:-?})"
write_state "running" "Mise à jour en cours" "$TARGET" "$STARTED" ""

# Charge les identifiants Postgres pour le dump.
if [ -f "$REPO_DIR/.env" ]; then
  set -a; . "$REPO_DIR/.env"; set +a
fi

fail() {
  log "ÉCHEC: $1"
  write_state "failed" "$1" "$TARGET" "$STARTED" "$(now)"
  rm -f "$REQUEST"
  exit 0
}

# 1) Sauvegarde de la base avant migrations.
BACKUP_FILE="$BACKUP_DIR/db_$(date -u +%Y%m%d_%H%M%S).sql"
log "Sauvegarde base -> $BACKUP_FILE"
if ! $DC -f "$REPO_DIR/docker-compose.yml" exec -T postgres \
     pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-postgres}" > "$BACKUP_FILE" 2>>"$LOG"; then
  fail "Échec de la sauvegarde de la base"
fi

# 2) Récupération du code (fast-forward only : refuse si l'historique a divergé).
#    safe.directory : le dépôt est monté en volume (bind mount Windows notamment),
#    git refuserait sinon d'opérer sur un dépôt « appartenant à un autre utilisateur ».
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true
log "git fetch + pull --ff-only origin $BRANCH"
if ! git -C "$REPO_DIR" fetch --quiet origin "$BRANCH" 2>>"$LOG"; then
  fail "git fetch a échoué"
fi
if ! git -C "$REPO_DIR" merge --ff-only "origin/$BRANCH" >>"$LOG" 2>&1; then
  fail "git pull --ff-only impossible (modifications locales ou historique divergent)"
fi

# 3) Reconstruction + redémarrage (les migrations Alembic tournent au démarrage du backend).
log "docker compose up -d --build $SERVICES"
# shellcheck disable=SC2086
if ! $DC -f "$REPO_DIR/docker-compose.yml" up -d --build $SERVICES >>"$LOG" 2>&1; then
  fail "docker compose up --build a échoué"
fi

# 4) Attente du healthcheck backend.
log "Attente du backend ($HEALTH_URL)"
i=0
while [ "$i" -lt 60 ]; do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    break
  fi
  i=$((i + 1))
  sleep 2
done
if [ "$i" -ge 60 ]; then
  fail "Le backend n'est pas redevenu sain après la mise à jour"
fi

log "Mise à jour terminée -> $(current_sha)"
write_state "done" "Mise à jour appliquée" "$TARGET" "$STARTED" "$(now)"
rm -f "$REQUEST"
