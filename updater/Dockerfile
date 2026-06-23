# Image de l'agent de mise à jour Tracr.
# Conteneur minimal disposant de git + docker CLI + compose, qui pilote la stack
# via le socket Docker monté. Fonctionne sous Windows (Docker Desktop), Linux et macOS.
FROM docker:27-cli

# docker-cli-compose : plugin "docker compose" ; util-linux : flock (verrou anti-chevauchement).
RUN apk add --no-cache git docker-cli-compose curl util-linux

WORKDIR /repo

# Le script et le dépôt sont montés en volume ; on boucle dessus toutes les 15 s.
CMD ["sh", "-c", "while true; do sh /repo/scripts/updater.sh || true; sleep 15; done"]
