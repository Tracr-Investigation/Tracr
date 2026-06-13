"""
test_investigations.py -- tests des routes investigations

endpoints couverts
  GET POST /investigations
  GET PATCH DELETE /investigations/{id}
  PATCH /investigations/{id}/status
  GET /investigations/statuses  GET /investigations/recent
  POST GET /investigations/{id}/collaborators
"""


class TestInvestigationCRUD:
    """tests crud investigations"""

    def test_create_investigation(self, client, auth):
        """verifie qu un utilisateur connecte peut creer une investigation

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer

        Returns:
            None
        """
        resp = client.post("/investigations", json={"title": "Operation Phenix", "description": "Description"}, headers=auth)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Operation Phenix"
        assert "id_investigation" in data

    def test_create_investigation_no_description(self, client, auth):
        """verifie qu une investigation sans description est acceptee

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer

        Returns:
            None
        """
        assert client.post("/investigations", json={"title": "Sans description"}, headers=auth).status_code == 200

    def test_create_investigation_title_too_long(self, client, auth):
        """verifie qu un titre de plus de 255 caracteres retourne 422

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer

        Returns:
            None
        """
        assert client.post("/investigations", json={"title": "x" * 256}, headers=auth).status_code == 422

    def test_create_investigation_unauthenticated(self, client):
        """verifie qu un utilisateur non connecte retourne 401

        Args:
            client (TestClient): client http injecte par pytest

        Returns:
            None
        """
        assert client.post("/investigations", json={"title": "Test"}).status_code == 401

    def test_list_investigations(self, client, auth, investigation):
        """verifie que la liste contient l investigation de l utilisateur

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation creee par la fixture

        Returns:
            None
        """
        resp = client.get("/investigations", headers=auth)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        ids = [i["id_investigation"] for i in data["investigations"]]
        assert investigation["id_investigation"] in ids

    def test_list_investigations_empty(self, client, auth):
        """verifie que la liste est vide pour un utilisateur sans investigation

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer

        Returns:
            None
        """
        resp = client.get("/investigations", headers=auth)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_get_investigation(self, client, auth, investigation):
        """verifie qu on peut recuperer le detail par id

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation de test

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        resp = client.get(f"/investigations/{inv_id}", headers=auth)
        assert resp.status_code == 200
        assert resp.json()["id_investigation"] == inv_id

    def test_get_investigation_not_found(self, client, auth):
        """verifie qu un id inexistant retourne 404

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer

        Returns:
            None
        """
        assert client.get("/investigations/999999", headers=auth).status_code == 404

    def test_update_investigation(self, client, auth, investigation):
        """verifie que le proprietaire peut modifier titre et description

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation de test

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        resp = client.patch(f"/investigations/{inv_id}", json={"title": "Nouveau titre", "description": "Nouvelle description"}, headers=auth)
        assert resp.status_code == 200
        assert resp.json()["title"] == "Nouveau titre"

    def test_delete_investigation(self, client, auth, investigation):
        """verifie que la suppression rend le detail inaccessible

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation de test

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        assert client.delete(f"/investigations/{inv_id}", headers=auth).status_code == 200
        assert client.get(f"/investigations/{inv_id}", headers=auth).status_code == 404

    def test_delete_investigation_not_owner(self, client, second_auth, investigation):
        """verifie qu un non proprietaire ne peut pas supprimer

        Args:
            client (TestClient): client http injecte par pytest
            second_auth (dict): header authorization d un autre utilisateur
            investigation (dict): investigation appartenant au premier utilisateur

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        assert client.delete(f"/investigations/{inv_id}", headers=second_auth).status_code == 403


class TestInvestigationStatus:
    """tests de gestion du statut"""

    def test_get_statuses(self, client, auth):
        """verifie que les 4 statuts de reference sont retournes

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer

        Returns:
            None
        """
        resp = client.get("/investigations/statuses", headers=auth)
        assert resp.status_code == 200
        statuses = resp.json()["statuses"]
        assert len(statuses) >= 4
        assert "Nouveau" in [s["name"] for s in statuses]

    def test_update_status(self, client, auth, investigation):
        """verifie que le proprietaire peut changer le statut

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation de test

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        assert client.patch(f"/investigations/{inv_id}/status", json={"id_status": 1}, headers=auth).status_code == 200

    def test_update_status_not_owner(self, client, second_auth, investigation):
        """verifie qu un non proprietaire ne peut pas changer le statut

        Args:
            client (TestClient): client http injecte par pytest
            second_auth (dict): header authorization d un autre utilisateur
            investigation (dict): investigation appartenant au premier utilisateur

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        assert client.patch(f"/investigations/{inv_id}/status", json={"id_status": 2}, headers=second_auth).status_code == 403


class TestRecentInvestigations:
    """tests de GET /investigations/recent"""

    def test_recent_investigations(self, client, auth, investigation):
        """verifie que les investigations recentes sont retournees en max 8

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation de test

        Returns:
            None
        """
        resp = client.get("/investigations/recent", headers=auth)
        assert resp.status_code == 200
        assert len(resp.json()["investigations"]) <= 8


class TestCollaborators:
    """tests de gestion des collaborateurs"""

    def test_invite_collaborator(self, client, auth, second_user, investigation):
        """verifie que le proprietaire peut inviter un collaborateur

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization du proprietaire
            second_user (dict): utilisateur a inviter
            investigation (dict): investigation de test

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        resp = client.post(f"/investigations/{inv_id}/collaborators", json={"pseudo": second_user["pseudo"], "permission_level": "lecteur"}, headers=auth)
        assert resp.status_code == 200

    def test_list_collaborators(self, client, auth, investigation):
        """verifie que la liste des collaborateurs est accessible

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation de test

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        resp = client.get(f"/investigations/{inv_id}/collaborators", headers=auth)
        assert resp.status_code == 200
        assert "collaborators" in resp.json()

    def test_invite_nonexistent_user(self, client, auth, investigation):
        """verifie qu inviter un pseudo inexistant retourne 404

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation de test

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        assert client.post(f"/investigations/{inv_id}/collaborators", json={"pseudo": "nobody_xyz_404", "permission_level": "lecteur"}, headers=auth).status_code == 404

    def test_invite_invalid_permission(self, client, auth, second_user, investigation):
        """verifie qu un niveau de permission invalide retourne 422

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            second_user (dict): utilisateur cible
            investigation (dict): investigation de test

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        assert client.post(f"/investigations/{inv_id}/collaborators", json={"pseudo": second_user["pseudo"], "permission_level": "godmode"}, headers=auth).status_code == 422
