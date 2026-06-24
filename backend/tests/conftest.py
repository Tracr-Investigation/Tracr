"""
conftest.py -- fixtures pytest partagees par toute la suite

base de test dediee (test_tracr), client http FastAPI, et fixtures
utilisateurs / investigations / taches reutilisables par les tests
"""
import os
import uuid

# env vars definies avant tout import de l app
_pg_host = os.environ.get("POSTGRES_HOST", "postgres")
_pg_user = os.environ.get("POSTGRES_USER", "dd")
_pg_pass = os.environ.get("POSTGRES_PASSWORD", "ddd")
_pg_port = os.environ.get("POSTGRES_PORT", "5432")
TEST_DB = "test_tracr"
TEST_DB_URL = f"postgresql://{_pg_user}:{_pg_pass}@{_pg_host}:{_pg_port}/{TEST_DB}"

os.environ["POSTGRES_DB"] = TEST_DB
os.environ["DATABASE_URL"] = TEST_DB_URL

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import pytest
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy import text
from fastapi.testclient import TestClient

# import de l app apres override des env vars
from app.main import fastapi_app
from app.dependencies import get_db



# moteur dedie aux tests independant de l engine de production
test_engine = create_engine(TEST_DB_URL, pool_pre_ping=True)


def _create_test_db() -> None:
    """Cree la base de donnees test_tracr si elle n'existe pas encore.

    Se connecte a la base postgres pour executer le CREATE DATABASE
    en dehors de toute transaction active.

    Returns:
        None
    """
    conn = psycopg2.connect(
        user=_pg_user,
        password=_pg_pass,
        host=_pg_host,
        port=int(_pg_port),
        dbname="postgres",
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (TEST_DB,))
    if not cur.fetchone():
        cur.execute(f'CREATE DATABASE "{TEST_DB}"')
    cur.close()
    conn.close()


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Initialise la base de test une seule fois pour toute la session pytest.

    - Cree la base test_tracr si absente
    - Cree toutes les tables via SQLModel.metadata
    - Insere les 4 statuts d investigation requis par DEFAULT_STATUS_ID = 4
    - Detruit les tables en fin de session

    Yields:
        None: Fixture de cycle de vie aucune valeur retournee.
    """
    from datetime import datetime, timezone
    from models.investigation_status import InvestigationStatus

    _create_test_db()
    SQLModel.metadata.create_all(test_engine)

    with Session(test_engine) as s:
        for sid, name, color in [
            (1, "En cours",  "#f59e0b"),
            (2, "Suspendue", "#6b7280"),
            (3, "Cloturee",  "#10b981"),
            (4, "Nouveau",   "#3b82f6"),
        ]:
            if not s.get(InvestigationStatus, sid):
                s.add(InvestigationStatus(
                    id_status=sid,
                    name=name,
                    color=color,
                    created_at=datetime.now(timezone.utc),
                ))
        s.commit()

    yield

    SQLModel.metadata.drop_all(test_engine)
    test_engine.dispose()


@pytest.fixture(autouse=True)
def clean_tables():
    """Efface toutes les donnees utilisateurs apres chaque test.

    TRUNCATE CASCADE sur users supprime en cascade toutes les tables liees
    sans toucher aux donnees de reference investigation_statuses et roles

    Yields:
        None: Fixture de cycle de vie aucune valeur retournee.
    """
    yield
    with test_engine.connect() as conn:
        conn.execute(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE"))
        conn.commit()


@pytest.fixture()
def client():
    """Fournit un client HTTP FastAPI configure pour utiliser test_engine.

    Remplace la dependance get_db par une session pointant sur test_tracr
    de sorte que chaque requete ecrit dans la base de test et non en dev

    Yields:
        TestClient: Client HTTP synchrone pret a emettre des requetes.
    """
    def override_get_db():
        """override de get_db qui injecte une session de test"""
        with Session(test_engine) as session:
            yield session

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app, raise_server_exceptions=True) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


def make_user(client: TestClient, pseudo: str | None = None, password: str = "Testpassword1!",
) -> dict:
    """Inscrit un utilisateur via l endpoint /register et retourne ses donnees.

    Args:
        client (TestClient): Client HTTP a utiliser pour la requete.
        pseudo (str | None): Pseudo souhaite genere automatiquement si None.
        password (str): Mot de passe doit satisfaire la validation de force.

    Returns:
        dict: Donnees de l utilisateur cree incluant id_user pseudo token role recovery_words password.
    """
    pseudo = pseudo or f"user_{uuid.uuid4().hex[:8]}"
    resp = client.post("/register", json={"pseudo": pseudo, "password": password})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    data["password"] = password
    return data


@pytest.fixture()
def user(client: TestClient) -> dict:
    """Cree et retourne un utilisateur de test inscrit via /register.

    Args:
        client (TestClient): Client HTTP injecte par pytest.

    Returns:
        dict: Donnees de l utilisateur id_user pseudo token password.
    """
    return make_user(client)


def auth_header(user: dict) -> dict:
    """Construit le header Authorization Bearer pour un utilisateur donne.

    Args:
        user (dict): Utilisateur avec une cle token.

    Returns:
        dict: Header HTTP sous la forme Authorization Bearer token.
    """
    return {"Authorization": f"Bearer {user['token']}"}


@pytest.fixture()
def auth(user: dict) -> dict:
    """Retourne le header Authorization Bearer pour l utilisateur de test.

    Args:
        user (dict): Fixture utilisateur injectee par pytest.

    Returns:
        dict: Header HTTP sous la forme Authorization Bearer token.
    """
    return auth_header(user)


@pytest.fixture()
def second_user(client: TestClient) -> dict:
    """Cree un second utilisateur independant du premier.

    Utile pour tester les verifications de permissions par exemple
    un utilisateur ne peut pas supprimer l investigation d un autre

    Args:
        client (TestClient): Client HTTP injecte par pytest.

    Returns:
        dict: Donnees du second utilisateur id_user pseudo token password.
    """
    return make_user(client)


@pytest.fixture()
def second_auth(second_user: dict) -> dict:
    """Retourne le header Authorization Bearer pour le second utilisateur.

    Args:
        second_user (dict): Fixture second utilisateur injectee par pytest.

    Returns:
        dict: Header HTTP sous la forme Authorization Bearer token.
    """
    return auth_header(second_user)


@pytest.fixture()
def investigation(client: TestClient, auth: dict) -> dict:
    """Cree et retourne une investigation appartenant a l utilisateur courant.

    Args:
        client (TestClient): Client HTTP injecte par pytest.
        auth (dict): Header Authorization du proprietaire de l investigation.

    Returns:
        dict: Donnees de l investigation creee id_investigation title description.
    """
    resp = client.post("/investigations", json={"title": "Test Investigation", "description": "Description de test"}, headers=auth)
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.fixture()
def task(client: TestClient, auth: dict, investigation: dict) -> dict:
    """Cree et retourne une tache de test dans l investigation courante.

    Args:
        client (TestClient): Client HTTP injecte par pytest.
        auth (dict): Header Authorization du proprietaire.
        investigation (dict): Investigation parente.

    Returns:
        dict: Donnees de la tache creee id_task title status priority.
    """
    resp = client.post(f"/investigations/{investigation['id_investigation']}/tasks", json={"title": "Tache test", "priority": "normale", "status": "todo"}, headers=auth)
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.fixture()
def document(client: TestClient, auth: dict, investigation: dict) -> dict:
    """Cree et retourne un document de test dans l investigation courante.

    Args:
        client (TestClient): Client HTTP injecte par pytest.
        auth (dict): Header Authorization du proprietaire.
        investigation (dict): Investigation parente.

    Returns:
        dict: Donnees du document cree id_document title content_html.
    """
    resp = client.post(f"/investigations/{investigation['id_investigation']}/documents", json={"title": "Document test", "content_html": "<p>Contenu initial</p>"}, headers=auth)
    assert resp.status_code == 200, resp.text
    return resp.json()
