# Tracr

Plateforme full-stack de gestion d'**enquêtes et d'investigations OSINT** : documents collaboratifs en temps réel, tâches, graphe d'entités, carte, archivage de sources web et chronologie d'activité.

## Stack

| Couche | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Query, TipTap, Yjs |
| **Backend** | FastAPI, SQLModel, Alembic, Uvicorn, python-socketio |
| **Base de données** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Stockage objet** | MinIO (captures de sources OSINT) |
| **Extension** | Manifest V3 (`extension/`) — capture de sources |
| **Auth / Collab** | JWT + bcrypt · y-websocket (CRDT temps réel) |

## Installation

Prérequis : **Docker**, **Docker Compose** et **Git**.

```bash
# 1. Cloner
git clone https://github.com/Tracr-Investigation/Tracr
cd Tracr

# 2. Configurer l'environnement
cp .env.example .env
```

Éditez `.env` (identifiants PostgreSQL/MinIO) et générez une clé secrète :

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"   # -> SECRET_KEY
```

```bash
# 3. Démarrer (les migrations Alembic s'appliquent automatiquement)
docker compose up -d
```

Frontend sur `http://localhost:5173`.

## Mise à jour depuis l'administration

L'onglet **Mises à jour** (réservé au super-admin) compare le code déployé au dépôt GitHub, affiche les commits à appliquer et permet de mettre à jour en un clic : une sauvegarde de la base est créée, le code récupéré, puis le backend redémarré.

L'opération est exécutée par le conteneur dédié `updater` (inclus dans `docker-compose.yml`, sans installation), qui pilote la stack via le socket Docker. Pour ne pas exposer le socket, retirez ce service : l'onglet reste fonctionnel en lecture (détection + aperçu).

### Mise à jour manuelle

```bash
git pull
docker compose up -d --build
```

