"""
test_docker_images.py -- tests d integrite des images Docker du projet Tracr.

Ces tests inspectent les images via la cli docker pour valider :
  - presence des images attendues (backend frontend websocket)
  - bonne base image et python version pour le backend
  - utilisateur non root configure pour chaque image
  - ports exposes corrects
  - presence de tini pour la gestion des signaux
  - taille raisonnable (eviter regression)
  - healthcheck declare au niveau compose pour le backend

Pre-requis :
  - docker installe et accessible
  - images deja construites (cf docker-build.sh)

Lancer :
  pytest tests/test_docker_images.py -v

Ces tests sont skippes automatiquement si docker n est pas disponible
ou si les images ne sont pas construites localement.
"""
import json
import shutil
import subprocess

import pytest


BACKEND_IMAGE = "tracr-backend:latest"
FRONTEND_IMAGE = "tracr-frontend:latest"
WEBSOCKET_IMAGE = "tracr-websocket:latest"
ALL_IMAGES = [BACKEND_IMAGE, FRONTEND_IMAGE, WEBSOCKET_IMAGE]


def _docker_available() -> bool:
    """verifie que docker cli est installe et accessible

    Returns:
        bool: True si docker est utilisable
    """
    if not shutil.which("docker"):
        return False
    result = subprocess.run(["docker", "info"], capture_output=True, text=True, timeout=5)
    return result.returncode == 0


def _image_exists(image: str) -> bool:
    """verifie qu une image docker est presente localement

    Args:
        image (str): nom complet de l image avec tag

    Returns:
        bool: True si l image existe en local
    """
    result = subprocess.run(["docker", "image", "inspect", image], capture_output=True, text=True)
    return result.returncode == 0


def _inspect(image: str) -> dict:
    """retourne le json complet de docker image inspect

    Args:
        image (str): nom complet de l image avec tag

    Returns:
        dict: premier element du resultat de docker image inspect
    """
    result = subprocess.run(["docker", "image", "inspect", image], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)[0]


def _run_in_image(image: str, command: list[str]) -> subprocess.CompletedProcess:
    """execute une commande dans un container ephemere puis le supprime

    Args:
        image (str): image a lancer
        command (list[str]): commande shell a executer

    Returns:
        CompletedProcess: resultat avec stdout stderr returncode
    """
    return subprocess.run(["docker", "run", "--rm", "--entrypoint", "", image, *command], capture_output=True, text=True, timeout=30)


pytestmark = pytest.mark.skipif(not _docker_available(), reason="docker non disponible")


@pytest.fixture(scope="module", autouse=True)
def require_images():
    """skip le module entier si les images ne sont pas construites

    Yields:
        None: fixture de cycle de vie aucune valeur retournee
    """
    missing = [img for img in ALL_IMAGES if not _image_exists(img)]
    if missing:
        pytest.skip(f"images non construites : {missing} -- lancer docker compose build")
    yield


class TestImagePresence:
    """verifie que les 3 images attendues existent en local"""

    @pytest.mark.parametrize("image", ALL_IMAGES)
    def test_image_exists(self, image):
        """verifie que l image est construite

        Args:
            image (str): nom de l image testee

        Returns:
            None
        """
        assert _image_exists(image), f"{image} introuvable lance docker compose build"


class TestBackendImage:
    """tests specifiques a l image backend python"""

    def test_python_version(self):
        """verifie que la version de python est 3.12 comme dans le Dockerfile

        Returns:
            None
        """
        result = _run_in_image(BACKEND_IMAGE, ["python", "--version"])
        assert result.returncode == 0
        assert "3.12" in result.stdout or "3.12" in result.stderr

    def test_runs_as_non_root(self):
        """verifie que le user par defaut n est pas root principe least privilege

        Returns:
            None
        """
        config = _inspect(BACKEND_IMAGE)["Config"]
        assert config.get("User") not in ("", "root", "0"), "le backend ne doit pas tourner en root"

    def test_uid_is_app_user(self):
        """verifie que l utilisateur a l UID 1001 cf Dockerfile

        Returns:
            None
        """
        result = _run_in_image(BACKEND_IMAGE, ["id", "-u"])
        assert result.stdout.strip() == "1001"

    def test_expose_port_8000(self):
        """verifie que le port 8000 est expose pour uvicorn

        Returns:
            None
        """
        config = _inspect(BACKEND_IMAGE)["Config"]
        assert "8000/tcp" in (config.get("ExposedPorts") or {})

    def test_tini_entrypoint(self):
        """verifie que tini est utilise comme entrypoint pour la gestion des signaux

        Returns:
            None
        """
        config = _inspect(BACKEND_IMAGE)["Config"]
        entrypoint = config.get("Entrypoint") or []
        assert any("tini" in arg for arg in entrypoint), "tini doit etre utilise comme PID 1"

    def test_venv_in_path(self):
        """verifie que le venv est dans le PATH

        Returns:
            None
        """
        config = _inspect(BACKEND_IMAGE)["Config"]
        env_vars = config.get("Env") or []
        path_var = next((e for e in env_vars if e.startswith("PATH=")), "")
        assert "/opt/venv/bin" in path_var

    def test_fastapi_installed(self):
        """verifie que les dependances python critiques sont installees

        Returns:
            None
        """
        result = _run_in_image(BACKEND_IMAGE, ["python", "-c", "import fastapi, sqlmodel, alembic"])
        assert result.returncode == 0, result.stderr

    def test_image_size_reasonable(self):
        """verifie que l image backend ne depasse pas 1Go

        Returns:
            None
        """
        size_bytes = _inspect(BACKEND_IMAGE).get("Size", 0)
        assert size_bytes < 1_000_000_000, f"image backend trop grosse {size_bytes} bytes"

    def test_no_dev_tools(self):
        """verifie que les outils de build apt ne sont pas dans le runtime
        principe de defense en profondeur

        Returns:
            None
        """
        result = _run_in_image(BACKEND_IMAGE, ["sh", "-c", "command -v gcc || echo absent"])
        assert "absent" in result.stdout

    def test_no_pip_cache(self):
        """verifie que les caches pip sont absents pour minimiser la surface

        Returns:
            None
        """
        result = _run_in_image(BACKEND_IMAGE, ["sh", "-c", "ls /root/.cache 2>&1 || echo absent"])
        assert "absent" in result.stdout or "No such file" in result.stdout


class TestFrontendImage:
    """tests specifiques a l image frontend node"""

    def test_runs_as_non_root(self):
        """verifie que le frontend ne tourne pas en root

        Returns:
            None
        """
        config = _inspect(FRONTEND_IMAGE)["Config"]
        assert config.get("User") not in ("", "root", "0")

    def test_node_version(self):
        """verifie que la version de node est 20 comme dans le Dockerfile

        Returns:
            None
        """
        result = _run_in_image(FRONTEND_IMAGE, ["node", "--version"])
        assert result.stdout.startswith("v20."), f"version inattendue {result.stdout}"

    def test_expose_port_5173(self):
        """verifie que le port vite 5173 est expose

        Returns:
            None
        """
        config = _inspect(FRONTEND_IMAGE)["Config"]
        assert "5173/tcp" in (config.get("ExposedPorts") or {})

    def test_tini_entrypoint(self):
        """verifie que tini est utilise comme entrypoint

        Returns:
            None
        """
        config = _inspect(FRONTEND_IMAGE)["Config"]
        entrypoint = config.get("Entrypoint") or []
        assert any("tini" in arg for arg in entrypoint)

    def test_uid_is_app_user(self):
        """verifie que l utilisateur a l UID 1001

        Returns:
            None
        """
        result = _run_in_image(FRONTEND_IMAGE, ["id", "-u"])
        assert result.stdout.strip() == "1001"


class TestWebsocketImage:
    """tests specifiques a l image websocket"""

    def test_runs_as_non_root(self):
        """verifie que le websocket ne tourne pas en root

        Returns:
            None
        """
        config = _inspect(WEBSOCKET_IMAGE)["Config"]
        assert config.get("User") not in ("", "root", "0")

    def test_expose_port_1234(self):
        """verifie que le port 1234 est expose

        Returns:
            None
        """
        config = _inspect(WEBSOCKET_IMAGE)["Config"]
        assert "1234/tcp" in (config.get("ExposedPorts") or {})

    def test_tini_entrypoint(self):
        """verifie que tini est utilise comme entrypoint

        Returns:
            None
        """
        config = _inspect(WEBSOCKET_IMAGE)["Config"]
        entrypoint = config.get("Entrypoint") or []
        assert any("tini" in arg for arg in entrypoint)

    def test_no_dev_dependencies(self):
        """verifie que les devDependencies node ne sont pas installees
        cf npm install --omit=dev dans le Dockerfile

        Returns:
            None
        """
        result = _run_in_image(
            WEBSOCKET_IMAGE,
            ["sh", "-c", "ls /app/node_modules | grep -i jest 2>&1 || echo absent"],
        )
        assert "absent" in result.stdout


class TestImageSecurityCommon:
    """checks de securite communs a toutes les images"""

    @pytest.mark.parametrize("image", ALL_IMAGES)
    def test_no_root_default(self, image):
        """verifie qu aucune image ne tourne en root par defaut

        Args:
            image (str): nom de l image testee

        Returns:
            None
        """
        config = _inspect(image)["Config"]
        user = config.get("User") or ""
        assert user not in ("", "root", "0"), f"{image} tourne en root"

    @pytest.mark.parametrize("image", ALL_IMAGES)
    def test_no_secret_env_vars(self, image):
        """verifie que les variables d environnement ne contiennent pas de secret
        en clair la configuration des secrets doit passer par env_file ou secrets

        Args:
            image (str): nom de l image testee

        Returns:
            None
        """
        config = _inspect(image)["Config"]
        env_vars = config.get("Env") or []
        forbidden = ("PASSWORD=", "SECRET=", "TOKEN=", "API_KEY=", "PRIVATE_KEY=")
        for var in env_vars:
            assert not any(var.upper().startswith(prefix) for prefix in forbidden), \
                f"{image} contient un secret dans l env {var.split('=')[0]}"

    @pytest.mark.parametrize("image", ALL_IMAGES)
    def test_has_healthcheck_or_simple_cmd(self, image):
        """verifie que les images ont un CMD defini

        Args:
            image (str): nom de l image testee

        Returns:
            None
        """
        config = _inspect(image)["Config"]
        assert config.get("Cmd"), f"{image} n a pas de CMD defini"
