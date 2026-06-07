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

### CI/CD

Infra 100% open source : Semgrep (SAST), Trivy, Gitleaks, Hadolint, OWASP ZAP

**Pre-commit**  hooks à chaque commit :

```bash
pip install pre-commit && pre-commit install
```

**Scans du repo** (rapports dans `./security-reports/`):

```bash
docker compose -f docker-compose.security.yml run --rm semgrep    # SAST
docker compose -f docker-compose.security.yml run --rm trivy-fs   # SCA + IaC + secrets
docker compose -f docker-compose.security.yml run --rm gitleaks   # secrets
docker compose -f docker-compose.security.yml run --rm hadolint   # lint Dockerfile

# DAST
docker compose up -d backend
docker compose -f docker-compose.security.yml run --rm zap-api
```

**CI GitHub Actions**  workflows `sast.yml`, `secrets.yml`, `sca-and-images.yml`, `dast.yml` (push/PR + scans hebdo). Résultats SARIF dans Security → Code scanning.

## Ports

| Service    | Port |
|------------|------|
| Frontend   | 5173 |
| Backend    | 8000 |
| WebSocket  | 1234 |
| PostgreSQL | 5432 |
| Redis      | 6379 |

## Stack technique

| Couche | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Query, TipTap, Yjs |
| **Backend** | FastAPI, SQLModel, Alembic, Uvicorn, python-socketio |
| **Base de données** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Authentification** | JWT (python-jose), bcrypt (passlib) |
| **Collaboration** | y-websocket (CRDT temps réel) |
