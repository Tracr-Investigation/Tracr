"""
test_tasks.py -- tests des routes tasks

endpoints couverts
  GET POST /investigations/{id}/tasks
  PATCH DELETE /investigations/{id}/tasks/{task_id}
  GET POST /investigations/{id}/tasks/{task_id}/responses
  DELETE /investigations/{id}/tasks/{task_id}/responses/{resp_id}
  GET /tasks/me
"""
from tests.helpers import patch_task, post_task_response


class TestTaskCRUD:
    """tests crud taches"""

    def test_create_task(self, client, auth, investigation):
        """verifie qu on peut creer une tache dans une investigation

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente

        Returns:
            None
        """
        resp = client.post(f"/investigations/{investigation['id_investigation']}/tasks", json={"title": "Analyser les logs", "priority": "haute", "status": "todo"}, headers=auth)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Analyser les logs"
        assert data["priority"] == "haute"
        assert data["status"] == "todo"

    def test_create_task_with_options(self, client, auth, investigation):
        """verifie qu une tache avec description et options avancees est acceptee

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente

        Returns:
            None
        """
        resp = client.post(f"/investigations/{investigation['id_investigation']}/tasks", json={"title": "Tache detaillee", "description": "Detail", "priority": "urgente", "is_private": True}, headers=auth)
        assert resp.status_code == 200
        assert resp.json()["is_private"] is True

    def test_create_task_invalid_priority(self, client, auth, investigation):
        """verifie qu une priorite invalide retourne 422

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente

        Returns:
            None
        """
        assert client.post(f"/investigations/{investigation['id_investigation']}/tasks", json={"title": "Tache", "priority": "critique"}, headers=auth).status_code == 422

    def test_create_task_invalid_status(self, client, auth, investigation):
        """verifie qu un statut invalide retourne 422

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente

        Returns:
            None
        """
        assert client.post(f"/investigations/{investigation['id_investigation']}/tasks", json={"title": "Tache", "status": "done"}, headers=auth).status_code == 422

    def test_create_task_unauthenticated(self, client, investigation):
        """verifie qu un utilisateur non connecte retourne 401

        Args:
            client (TestClient): client http injecte par pytest
            investigation (dict): investigation parente

        Returns:
            None
        """
        assert client.post(f"/investigations/{investigation['id_investigation']}/tasks", json={"title": "Tache"}).status_code == 401

    def test_list_tasks(self, client, auth, investigation, task):
        """verifie que la liste inclut la tache creee

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente
            task (dict): tache creee par la fixture

        Returns:
            None
        """
        resp = client.get(f"/investigations/{investigation['id_investigation']}/tasks", headers=auth)
        assert resp.status_code == 200
        assert task["id_task"] in [t["id_task"] for t in resp.json()["tasks"]]

    def test_update_task_status(self, client, auth, investigation, task):
        """verifie qu on peut passer une tache de todo a en_cours

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente
            task (dict): tache de test

        Returns:
            None
        """
        resp = patch_task(client, auth, investigation["id_investigation"], task["id_task"], {"status": "en_cours"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "en_cours"

    def test_update_task_title(self, client, auth, investigation, task):
        """verifie qu on peut modifier le titre d une tache

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente
            task (dict): tache de test

        Returns:
            None
        """
        resp = patch_task(client, auth, investigation["id_investigation"], task["id_task"], {"title": "Titre mis a jour"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Titre mis a jour"

    def test_mark_task_done(self, client, auth, investigation, task):
        """verifie qu on peut marquer une tache comme terminee

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente
            task (dict): tache de test

        Returns:
            None
        """
        resp = patch_task(client, auth, investigation["id_investigation"], task["id_task"], {"status": "termine"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "termine"

    def test_delete_task(self, client, auth, investigation, task):
        """verifie que la suppression retire la tache de la liste

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente
            task (dict): tache a supprimer

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        assert client.delete(f"/investigations/{inv_id}/tasks/{task['id_task']}", headers=auth).status_code == 200
        ids = [t["id_task"] for t in client.get(f"/investigations/{inv_id}/tasks", headers=auth).json()["tasks"]]
        assert task["id_task"] not in ids

    def test_delete_task_unauthorized(self, client, second_auth, investigation, task):
        """verifie qu un autre utilisateur ne peut pas supprimer la tache

        Args:
            client (TestClient): client http injecte par pytest
            second_auth (dict): header authorization d un autre utilisateur
            investigation (dict): investigation parente
            task (dict): tache appartenant au premier utilisateur

        Returns:
            None
        """
        assert client.delete(f"/investigations/{investigation['id_investigation']}/tasks/{task['id_task']}", headers=second_auth).status_code == 403


class TestTaskResponses:
    """tests des reponses aux taches"""

    def test_create_response(self, client, auth, investigation, task):
        """verifie qu on peut ajouter une reponse a une tache

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente
            task (dict): tache cible

        Returns:
            None
        """
        resp = post_task_response(client, auth, investigation["id_investigation"], task["id_task"], "Analyse completee")
        assert resp["content"] == "Analyse completee"

    def test_list_responses(self, client, auth, investigation, task):
        """verifie que les reponses creees sont retournees dans la liste

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente
            task (dict): tache dont on liste les reponses

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        task_id = task["id_task"]
        post_task_response(client, auth, inv_id, task_id, "Premiere reponse")
        resp = client.get(f"/investigations/{inv_id}/tasks/{task_id}/responses", headers=auth)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_delete_response(self, client, auth, investigation, task):
        """verifie qu on peut supprimer une reponse

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente
            task (dict): tache contenant la reponse

        Returns:
            None
        """
        inv_id = investigation["id_investigation"]
        task_id = task["id_task"]
        response = post_task_response(client, auth, inv_id, task_id, "A supprimer")
        assert client.delete(f"/investigations/{inv_id}/tasks/{task_id}/responses/{response['id_response']}", headers=auth).status_code == 200

    def test_create_response_empty_content(self, client, auth, investigation, task):
        """verifie qu une reponse vide retourne 422

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente
            task (dict): tache cible

        Returns:
            None
        """
        assert client.post(f"/investigations/{investigation['id_investigation']}/tasks/{task['id_task']}/responses", json={"content": ""}, headers=auth).status_code == 422


class TestMyTasks:
    """tests de GET /tasks/me"""

    def test_get_my_tasks(self, client, auth, investigation, task):
        """verifie que l endpoint retourne les taches de l utilisateur courant

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente necessaire pour avoir des taches
            task (dict): tache de test

        Returns:
            None
        """
        resp = client.get("/tasks/me", headers=auth)
        assert resp.status_code == 200
        assert "tasks" in resp.json()

    def test_get_my_tasks_unauthenticated(self, client):
        """verifie que tasks/me sans token retourne 401

        Args:
            client (TestClient): client http injecte par pytest

        Returns:
            None
        """
        assert client.get("/tasks/me").status_code == 401
