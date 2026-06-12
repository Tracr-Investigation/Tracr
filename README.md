# Tracr

Application full-stack de gestion d'enquêtes et d'investigations — backend FastAPI, frontend React TypeScript, collaboration temps réel via Yjs.

## Prérequis

- **Docker** et **Docker Compose**
- **Git**

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/Tracr-Investigation/Tracr
cd Tracr
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditez `.env` :

```env
# PostgreSQL
POSTGRES_USER=usertracr
POSTGRES_PASSWORD=votre_mot_de_passe
POSTGRES_DB=tracrdb
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# URLs de connexion
DATABASE_URL=postgresql://usertracr:votre_mot_de_passe@postgres:5432/tracrdb
REDIS_URL=redis://redis:6379

# FastAPI
SECRET_KEY=votre_cle_secrete
DEBUG=True
```

Générer une clé secrète :

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Démarrer

```bash
docker-compose up -d
```

Les migrations sont appliquées automatiquement au démarrage du backend.

## Commandes

### Docker

```bash
docker-compose up -d          # Démarrer tous les services
docker-compose down           # Arrêter
docker-compose logs -f        # Logs en temps réel
```

### Migrations Alembic

```bash
# Appliquer les migrations
docker-compose exec backend alembic upgrade head

# Créer une nouvelle migration
docker-compose exec backend alembic revision --autogenerate -m "description"
```

### Frontend (hors Docker)

```bash
cd frontend
npm install
npm run dev      # Port 5173
npm run build
npm run lint
```

### Backend (hors Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Linux / macOS
# .venv\Scripts\activate        # Windows
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload
```

## Tests

### Backend  tests fonctionnels (pytest)

Les tests s'exécutent dans le container backend car ils ont besoin de PostgreSQL et Redis.

```bash
# Demarrer la stack
docker compose up -d

# Installer les dependances 
# utils 0 (root) car le venv appartient a root mais le container tourne en user 
docker compose exec -u 0 backend pip install -r requirements-test.txt

# 3. Lancer tous les tests
docker compose exec backend pytest tests/ -v

# Variantes
docker compose exec backend pytest tests/test_auth.py -v                    # un fichier
docker compose exec backend pytest tests/test_auth.py::TestLogin -v         # une classe
docker compose exec backend pytest tests/test_auth.py::TestLogin::test_login_success -v  # un test
docker compose exec backend pytest -k "register" -v                         # filtrer par mot-cle
docker compose exec backend pytest tests/ -v --cov=app --cov=services       # avec couverture
```

### Backend tests des images Docker 

Tests qui valident la conformité des images (user non-root, ports, healthchecks, taille, présence de tini, etc.). Lancement **depuis l'hôte** car ils utilisent la CLI `docker`.

```bash
# Pre-requis : pytest installe sur l'hote
pip install pytest

# Lancer --noconftest evite la dependance Postgres
cd backend
pytest tests/test_docker_images.py --noconftest -v
```

### E2E  Cypress

Cypress tourne contre une **DB dédiée** `tracr_e2e` pour ne pas polluer la DB de dev. Le fichier [docker-compose.e2e.yml](docker-compose.e2e.yml) override le backend pour pointer dessus et désactive le rate-limit.

#### Setup initial

```bash
# Creer la DB tracr_e2e dans l'instance Postgres
source .env
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE tracr_e2e;"
```

#### Switch dev → E2E

```bash
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --force-recreate backend
```

Le backend pointe maintenant sur `tracr_e2e`. Alembic migre les tables automatiquement. Le rate-limit est désactivé.

#### Restaurer la db d'origine

```bash
docker compose up -d --force-recreate backend
```

#### Reset de la DB E2E (entre sessions)

```bash
source .env
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d tracr_e2e -c "TRUNCATE TABLE users RESTART IDENTITY CASCADE;"
```

#### Mode classique (Cypress installé localement)

```bash
cd e2e
npm install                 

npm run cy:open              # GUI interactive
npm run cy:run               # headless 

# Cibler un fichier precis
npm run cy:run:auth
npm run cy:run:investigations
npm run cy:run:documents
npm run cy:run:tasks
```

#### Mode Docker


```bash
cd e2e

# Headless  tous les specs
docker run -it --rm --network host -v "$PWD":/e2e -w /e2e cypress/included:13.17.0

# Headless  un seul fichier
docker run -it --rm --network host -v "$PWD":/e2e -w /e2e cypress/included:13.17.0 --spec 'cypress/e2e/auth.cy.ts'

# Avec affichage (GUI Cypress) 
docker run -it --rm --network host -e DISPLAY=$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix -v "$PWD":/e2e -w /e2e  --entrypoint cypress cypress/included:13.17.0 open --project /e2e
```

Les captures d'écran des tests failed sont dans `e2e/cypress/screenshots/`.

## Ports

| Service        | Port |
|----------------|------|
| Frontend       | 5173 |
| Backend        | 8000 |
| WebSocket      | 1234 |
| PostgreSQL     | 5432 |
| Redis          | 6379 |
| MinIO (API)    | 9000 |
| MinIO (console)| 9001 |

## Stack technique

| Couche | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Query, TipTap, Yjs |
| **Backend** | FastAPI, SQLModel, Alembic, Uvicorn, python-socketio |
| **Base de données** | PostgreSQL 16 |
| **Stockage objet** | MinIO (captures de sources OSINT) |
| **Extension** | Manifest V3 (`extension/`) — capture de sources, voir [extension/README.md](extension/README.md) |
| **Cache** | Redis 7 |
| **Authentification** | JWT (python-jose), bcrypt (passlib) |
| **Collaboration** | y-websocket (CRDT temps réel) |
