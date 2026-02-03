# Tracr

Application full-stack de gestion d'enquêtes et d'investigations, avec un backend FastAPI et un frontend React TypeScript.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé les outils suivants :

- **Python** 3.10+
- **Node.js** 18+ et **npm**
- **Docker** et **Docker Compose** (pour PostgreSQL et Redis)
- **Git**

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/Tracr-Investigation/Tracr
cd tracr
```

### 2. Configurer les variables d'environnement

Copiez le fichier d'exemple et renseignez vos valeurs :

```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos propres valeurs :

```env
# PostgreSQL
POSTGRES_USER=usertracr
POSTGRES_PASSWORD=votre_mot_de_passe
POSTGRES_DB=tracrdb
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# URLs de connexion
DATABASE_URL=postgresql://usertracr:votre_mot_de_passe@localhost:5432/tracrdb
REDIS_URL=redis://localhost:6379

# FastAPI
SECRET_KEY=votre_cle_secrete
DEBUG=True
```

> **Note :** Pour générer une clé secrète, vous pouvez utiliser :
> ```bash
> python -c "import secrets; print(secrets.token_urlsafe(32))"
> ```

### 3. Lancer les services Docker (PostgreSQL + Redis)

```bash
docker-compose up -d
```

Cela démarre :
- **PostgreSQL 16** sur le port `5432`
- **Redis 7** sur le port `6379`

Pour vérifier que les services sont bien lancés :

```bash
docker-compose ps
```

### 4. Installer le backend

```bash
cd backend

# Créer un environnement virtuel Python
python -m venv .venv

# Activer l'environnement virtuel
source .venv/bin/activate        # Linux / macOS
# .venv\Scripts\activate         # Windows

# Installer les dépendances
pip install -r requirements.txt
```

### 5. Initialiser la base de données

Toujours depuis le dossier `backend/` :

```bash
alembic upgrade head
```

Cela crée les tables nécessaires (notamment la table `users`).

### 6. Installer le frontend

```bash
cd ../frontend

# Installer les dépendances Node.js
npm install
```

## Lancement

Ouvrez **3 terminaux** distincts :

### Terminal 1 : Services Docker

```bash
# Si pas déjà lancé
docker-compose up
```

### Terminal 2 : Backend (API)

```bash
cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```

Le backend sera accessible sur **http://localhost:8000**.

### Terminal 3 : Frontend

```bash
cd frontend
npm run dev
```

Le frontend sera accessible sur **http://localhost:5173**.

## Commandes utiles

### Backend

| Commande | Description |
|---|---|
| `python -m uvicorn app.main:app --reload` | Lancer le serveur de développement |
| `alembic upgrade head` | Appliquer les migrations |
| `alembic revision --autogenerate -m "description"` | Créer une nouvelle migration |

### Frontend

| Commande | Description |
|---|---|
| `npm run dev` | Lancer le serveur de développement |
| `npm run build` | Compiler pour la production |
| `npm run lint` | Vérifier le code avec ESLint |
| `npm run preview` | Prévisualiser le build de production |

### Docker

| Commande | Description |
|---|---|
| `docker-compose up -d` | Démarrer les services en arrière-plan |
| `docker-compose down` | Arrêter les services |
| `docker-compose logs -f` | Voir les logs en temps réel |

## Architecture du projet

```
tracr/
├── backend/
│   ├── app/
│   │   └── main.py              # Point d'entrée FastAPI, routes, middleware
│   ├── models/
│   │   └── user.py              # Modèles SQLModel
│   ├── services/
│   │   └── user_service.py      # Logique métier
│   ├── alembic/                 # Migrations de base de données
│   ├── config.py                # Configuration (variables d'environnement)
│   ├── alembic.ini              # Configuration Alembic
│   └── requirements.txt        # Dépendances Python
├── frontend/
│   ├── src/
│   │   ├── pages/               # Pages (login, dashboard, enquêtes...)
│   │   ├── components/          # Composants réutilisables (Layout, Sidebar)
│   │   ├── contexts/            # Contextes React (AuthContext)
│   │   ├── routes/              # Protection des routes (ProtectedRoute)
│   │   └── services/            # Client API
│   ├── package.json             # Dépendances Node.js
│   └── vite.config.ts           # Configuration Vite
├── docker-compose.yml           # Services Docker (PostgreSQL, Redis)
├── .env.example                 # Modèle de variables d'environnement
└── README.md                    # Ce fichier
```

## Stack technique

| Couche | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Query |
| **Backend** | FastAPI, SQLModel, Alembic, Uvicorn |
| **Base de données** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Authentification** | JWT (python-jose), bcrypt (passlib) |

## Ports utilisés

| Service | Port |
|---|---|
| Frontend (dev) | 5173 |
| Backend (API) | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
