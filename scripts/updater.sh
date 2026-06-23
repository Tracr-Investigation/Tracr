#!/usr/bin/env sh
# Agent de mise à jour Tracr : applique les demandes émises depuis l'admin.
set -eu

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
DC="${DC:-docker compose}"
# Conteneur(s) à redémarrer après le pull (jamais reconstruire : voir étape 3).
RESTART="${RESTART:-tracr_backend}"

mkdir -p "$UPDATE_DIR" "$BACKUP_DIR"
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

# Verrou anti-chevauchement.
exec 9>"$LOCK"
flock -n 9 || exit 0

# Pas de demande : refresh idle, en conservant un dernier résultat done/failed.
if [ ! -f "$REQUEST" ]; then
  PREV=$(sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$STATE" 2>/dev/null || true)
  [ "$PREV" = "done" ] || [ "$PREV" = "failed" ] || write_state "idle" "" "" "" ""
  exit 0
fi

STARTED=$(now)
TARGET=$(sed -n 's/.*"target_sha"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$REQUEST" 2>/dev/null || echo "")
log "Demande reçue (cible: ${TARGET:-?})"
write_state "running" "Mise à jour en cours" "$TARGET" "$STARTED" ""

fail() {
  log "ÉCHEC: $1"
  write_state "failed" "$1" "$TARGET" "$STARTED" "$(now)"
  rm -f "$REQUEST"
  exit 0
}

# Identifiants Postgres pour le dump (sans sourcer .env : un .env CRLF casserait sh).
read_env() { grep -E "^$1=" "$REPO_DIR/.env" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\r\n"'; }
PG_USER="$(read_env POSTGRES_USER)"; : "${PG_USER:=${POSTGRES_USER:-postgres}}"
PG_DB="$(read_env POSTGRES_DB)";     : "${PG_DB:=${POSTGRES_DB:-postgres}}"

# 1) Sauvegarde de la base.
BACKUP_FILE="$BACKUP_DIR/db_$(date -u +%Y%m%d_%H%M%S).sql"
log "Sauvegarde base -> $BACKUP_FILE"
$DC -f "$REPO_DIR/docker-compose.yml" exec -T postgres pg_dump -U "$PG_USER" "$PG_DB" > "$BACKUP_FILE" 2>>"$LOG" \
  || fail "Échec de la sauvegarde de la base"

# 2) Récupération du code (fast-forward only).
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true
log "git fetch + merge --ff-only origin/$BRANCH"
git -C "$REPO_DIR" fetch --quiet origin "$BRANCH" 2>>"$LOG" || fail "git fetch a échoué"
git -C "$REPO_DIR" merge --ff-only "origin/$BRANCH" >>"$LOG" 2>&1 \
  || fail "git merge --ff-only impossible (dépôt local modifié ou divergent)"

# 3) Redémarrage du backend : réexécute les migrations Alembic et recharge le code
#    bind-mounté. On NE fait PAS "compose up --build" — lancé depuis ce conteneur, il
#    résoudrait les bind mounts vers des chemins inexistants sur l'hôte et casserait /app.
log "docker restart $RESTART"
# shellcheck disable=SC2086
docker restart $RESTART >>"$LOG" 2>&1 || fail "redémarrage du backend impossible"

# 4) Attente du retour à la santé du backend.
log "Attente du backend ($HEALTH_URL)"
i=0
while [ "$i" -lt 60 ]; do
  curl -fsS "$HEALTH_URL" >/dev/null 2>&1 && break
  i=$((i + 1)); sleep 2
done
[ "$i" -lt 60 ] || fail "Le backend n'est pas redevenu sain"

log "Terminé -> $(current_sha)"
write_state "done" "Mise à jour appliquée" "$TARGET" "$STARTED" "$(now)"
rm -f "$REQUEST"
