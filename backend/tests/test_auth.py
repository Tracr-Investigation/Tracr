"""
test_auth.py -- tests des routes d authentification

endpoints couverts
  POST /register
  POST /login
  POST /change-password
  POST /delete-account
  GET /me
  PATCH /me/language
"""
import uuid


PASSWORD = "Testpassword1!"
NEW_PASSWORD = "NewPassword99!"


class TestRegister:
    """tests de POST /register"""

    def test_register_success(self, client):
        """verifie qu un nouvel utilisateur peut s inscrire

        Args:
            client (TestClient): client http injecte par pytest

        Returns:
            None
        """
        pseudo = f"new_{uuid.uuid4().hex[:8]}"
        resp = client.post("/register", json={"pseudo": pseudo, "password": PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert data["pseudo"] == pseudo
        assert "token" in data
        assert "recovery_words" in data
        assert data["role"] == "user"

    def test_register_duplicate_pseudo(self, client, user):
        """verifie qu un pseudo deja pris retourne 409

        Args:
            client (TestClient): client http injecte par pytest
            user (dict): utilisateur existant cree par la fixture

        Returns:
            None
        """
        resp = client.post("/register", json={"pseudo": user["pseudo"], "password": PASSWORD})
        assert resp.status_code == 409

    def test_register_weak_password(self, client):
        """verifie qu un mot de passe trop faible retourne 422

        Args:
            client (TestClient): client http injecte par pytest

        Returns:
            None
        """
        resp = client.post("/register", json={"pseudo": "validpseudo", "password": "abc"})
        assert resp.status_code == 422

    def test_register_pseudo_too_short(self, client):
        """verifie qu un pseudo de moins de 3 caracteres retourne 422

        Args:
            client (TestClient): client http injecte par pytest

        Returns:
            None
        """
        resp = client.post("/register", json={"pseudo": "ab", "password": PASSWORD})
        assert resp.status_code == 422


class TestLogin:
    """tests de POST /login"""

    def test_login_success(self, client, user):
        """verifie qu un utilisateur existant peut se connecter

        Args:
            client (TestClient): client http injecte par pytest
            user (dict): utilisateur de test avec pseudo et password

        Returns:
            None
        """
        resp = client.post("/login", json={"pseudo": user["pseudo"], "password": user["password"]})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["pseudo"] == user["pseudo"]
        assert data["role"] == "user"
        assert data["must_change_password"] is False

    def test_login_wrong_password(self, client, user):
        """verifie qu un mauvais mot de passe retourne 401

        Args:
            client (TestClient): client http injecte par pytest
            user (dict): utilisateur de test

        Returns:
            None
        """
        resp = client.post("/login", json={"pseudo": user["pseudo"], "password": "WrongPass99!"})
        assert resp.status_code == 401

    def test_login_unknown_user(self, client):
        """verifie qu un pseudo inconnu retourne 401

        Args:
            client (TestClient): client http injecte par pytest

        Returns:
            None
        """
        resp = client.post("/login", json={"pseudo": "nobody_xyz", "password": PASSWORD})
        assert resp.status_code == 401

    def test_login_returns_user_id(self, client, user):
        """verifie que la reponse contient le bon id_user

        Args:
            client (TestClient): client http injecte par pytest
            user (dict): utilisateur avec id_user connu

        Returns:
            None
        """
        resp = client.post("/login", json={"pseudo": user["pseudo"], "password": user["password"]})
        assert resp.json()["id_user"] == user["id_user"]


class TestMe:
    """tests de GET /me"""

    def test_get_me_success(self, client, user, auth):
        """verifie que me retourne les informations de l utilisateur connecte

        Args:
            client (TestClient): client http injecte par pytest
            user (dict): utilisateur de test
            auth (dict): header authorization bearer

        Returns:
            None
        """
        resp = client.get("/me", headers=auth)
        assert resp.status_code == 200
        assert resp.json()["pseudo"] == user["pseudo"]
        assert resp.json()["id_user"] == user["id_user"]

    def test_get_me_no_token(self, client):
        """verifie que me sans token retourne 401

        Args:
            client (TestClient): client http injecte par pytest

        Returns:
            None
        """
        assert client.get("/me").status_code == 401

    def test_get_me_invalid_token(self, client):
        """verifie que me avec un token invalide retourne 401

        Args:
            client (TestClient): client http injecte par pytest

        Returns:
            None
        """
        resp = client.get("/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401


class TestChangePassword:
    """tests de POST /change-password"""

    def test_change_password_success(self, client, user, auth):
        """verifie qu un utilisateur peut changer son mot de passe
        et que le nouveau permet de se connecter

        Args:
            client (TestClient): client http injecte par pytest
            user (dict): utilisateur avec l ancien mot de passe
            auth (dict): header authorization bearer

        Returns:
            None
        """
        resp = client.post("/change-password", json={"current_password": user["password"], "new_password": NEW_PASSWORD}, headers=auth)
        assert resp.status_code == 200
        assert client.post("/login", json={"pseudo": user["pseudo"], "password": NEW_PASSWORD}).status_code == 200

    def test_change_password_wrong_current(self, client, auth):
        """verifie qu un mauvais mot de passe actuel retourne 400

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer

        Returns:
            None
        """
        resp = client.post("/change-password", json={"current_password": "WrongOld99!", "new_password": NEW_PASSWORD}, headers=auth)
        assert resp.status_code == 400

    def test_change_password_weak_new(self, client, user, auth):
        """verifie que le nouveau mot de passe est valide en force

        Args:
            client (TestClient): client http injecte par pytest
            user (dict): utilisateur de test
            auth (dict): header authorization bearer

        Returns:
            None
        """
        resp = client.post("/change-password", json={"current_password": user["password"], "new_password": "weak"}, headers=auth)
        assert resp.status_code == 422


class TestLanguage:
    """tests de PATCH /me/language"""

    def test_update_language(self, client, auth):
        """verifie qu un utilisateur peut changer sa langue

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer

        Returns:
            None
        """
        resp = client.patch("/me/language", json={"language": "fr"}, headers=auth)
        assert resp.status_code == 200
        assert resp.json()["language"] == "fr"

    def test_invalid_language(self, client, auth):
        """verifie qu une langue non supportee retourne 422

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer

        Returns:
            None
        """
        assert client.patch("/me/language", json={"language": "de"}, headers=auth).status_code == 422


class TestDeleteAccount:
    """tests de POST /delete-account"""

    def test_delete_account(self, client, user, auth):
        """verifie qu un utilisateur peut supprimer son compte
        et que la connexion est ensuite refusee

        Args:
            client (TestClient): client http injecte par pytest
            user (dict): utilisateur de test
            auth (dict): header authorization bearer

        Returns:
            None
        """
        assert client.post("/delete-account", json={"password": user["password"]}, headers=auth).status_code == 200
        assert client.post("/login", json={"pseudo": user["pseudo"], "password": user["password"]}).status_code == 401

    def test_delete_account_wrong_password(self, client, auth):
        """verifie qu un mauvais mot de passe empeche la suppression

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer

        Returns:
            None
        """
        assert client.post("/delete-account", json={"password": "Wrong99!"}, headers=auth).status_code == 400
