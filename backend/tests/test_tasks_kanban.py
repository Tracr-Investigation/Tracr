"""
test_tasks_kanban.py -- tests des fonctionnalites Kanban

endpoints couverts
  PATCH /investigations/{id}/tasks/{task_id}/move
  GET POST PATCH DELETE /tasks/personal
  PATCH /tasks/personal/{task_id}/move
  GET /tasks/assigned
"""


def _create_inv_task(client, auth, inv_id, title="Tache", status="todo"):
    """cree une tache d enquete et renvoie le dict json de la reponse"""
    return client.post(
        f"/investigations/{inv_id}/tasks",
        json={"title": title, "status": status, "priority": "normale"},
        headers=auth,
    ).json()


class TestNewStatuses:
    """les nouveaux statuts Kanban sont acceptes"""

    def test_create_task_bloque(self, client, auth, investigation):
        """le statut bloque est accepte a la creation"""
        resp = client.post(
            f"/investigations/{investigation['id_investigation']}/tasks",
            json={"title": "Bloquee", "status": "bloque"},
            headers=auth,
        )
        assert resp.status_code == 200, resp.text
        assert resp.json()["status"] == "bloque"

    def test_create_task_en_revue_a_valider(self, client, auth, investigation):
        """les statuts en_revue et a_valider sont acceptes"""
        inv_id = investigation["id_investigation"]
        for status in ("en_revue", "a_valider"):
            resp = client.post(
                f"/investigations/{inv_id}/tasks",
                json={"title": status, "status": status},
                headers=auth,
            )
            assert resp.status_code == 200, resp.text
            assert resp.json()["status"] == status

    def test_invalid_status_still_rejected(self, client, auth, investigation):
        """un statut inconnu est toujours rejete (422)"""
        assert client.post(
            f"/investigations/{investigation['id_investigation']}/tasks",
            json={"title": "X", "status": "done"},
            headers=auth,
        ).status_code == 422


class TestInvestigationKanbanMove:
    """deplacement Kanban des taches d enquete"""

    def test_move_changes_status(self, client, auth, investigation, task):
        """deplacer une tache change son statut et sa position"""
        inv_id = investigation["id_investigation"]
        resp = client.patch(
            f"/investigations/{inv_id}/tasks/{task['id_task']}/move",
            json={"status": "en_cours", "position": 0},
            headers=auth,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["status"] == "en_cours"
        assert body["position"] == 0

    def test_move_reorders_positions(self, client, auth, investigation):
        """deplacer une carte renumerote la colonne de facon contigue"""
        inv_id = investigation["id_investigation"]
        a = _create_inv_task(client, auth, inv_id, "A")
        b = _create_inv_task(client, auth, inv_id, "B")
        c = _create_inv_task(client, auth, inv_id, "C")
        # positions initiales : A=0, B=1, C=2 dans la colonne todo
        assert (a["position"], b["position"], c["position"]) == (0, 1, 2)
        # on place C en tete de colonne todo
        client.patch(
            f"/investigations/{inv_id}/tasks/{c['id_task']}/move",
            json={"status": "todo", "position": 0},
            headers=auth,
        )
        tasks = {t["id_task"]: t["position"] for t in client.get(
            f"/investigations/{inv_id}/tasks", headers=auth).json()["tasks"]}
        assert tasks[c["id_task"]] == 0
        assert tasks[a["id_task"]] == 1
        assert tasks[b["id_task"]] == 2

    def test_move_unauthorized(self, client, second_auth, investigation, task):
        """un non-membre ne peut pas deplacer une tache (403/404)"""
        inv_id = investigation["id_investigation"]
        assert client.patch(
            f"/investigations/{inv_id}/tasks/{task['id_task']}/move",
            json={"status": "en_cours", "position": 0},
            headers=second_auth,
        ).status_code in (403, 404)


class TestPersonalTasks:
    """taches personnelles (hors enquete)"""

    def test_create_and_list_personal(self, client, auth):
        """on peut creer une tache perso et la retrouver dans la liste"""
        resp = client.post("/tasks/personal", json={"title": "Perso 1"}, headers=auth)
        assert resp.status_code == 200, resp.text
        created = resp.json()
        assert created["id_investigation"] is None
        listed = client.get("/tasks/personal", headers=auth).json()["tasks"]
        assert created["id_task"] in [t["id_task"] for t in listed]

    def test_personal_task_isolated_per_user(self, client, auth, second_auth):
        """une tache perso est invisible et non modifiable par un autre utilisateur"""
        created = client.post("/tasks/personal", json={"title": "Secret"}, headers=auth).json()
        # un autre utilisateur ne voit pas la tache perso
        other = client.get("/tasks/personal", headers=second_auth).json()["tasks"]
        assert created["id_task"] not in [t["id_task"] for t in other]
        # et ne peut pas la modifier/supprimer
        assert client.delete(f"/tasks/personal/{created['id_task']}", headers=second_auth).status_code == 404
        assert client.patch(
            f"/tasks/personal/{created['id_task']}",
            json={"title": "hack"},
            headers=second_auth,
        ).status_code == 404

    def test_update_and_delete_personal(self, client, auth):
        """on peut modifier puis supprimer sa tache perso"""
        created = client.post("/tasks/personal", json={"title": "A modifier"}, headers=auth).json()
        upd = client.patch(
            f"/tasks/personal/{created['id_task']}",
            json={"title": "Modifiee", "status": "en_cours"},
            headers=auth,
        )
        assert upd.status_code == 200
        assert upd.json()["title"] == "Modifiee"
        assert upd.json()["status"] == "en_cours"
        assert client.delete(f"/tasks/personal/{created['id_task']}", headers=auth).status_code == 200

    def test_move_personal_task(self, client, auth):
        """on peut deplacer une tache perso sur le Kanban perso"""
        created = client.post("/tasks/personal", json={"title": "Move me"}, headers=auth).json()
        resp = client.patch(
            f"/tasks/personal/{created['id_task']}/move",
            json={"status": "termine", "position": 0},
            headers=auth,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "termine"

    def test_personal_not_in_investigation_list(self, client, auth, investigation):
        """une tache perso ne fuit pas dans le board d une enquete"""
        created = client.post("/tasks/personal", json={"title": "Perso"}, headers=auth).json()
        inv_tasks = client.get(
            f"/investigations/{investigation['id_investigation']}/tasks", headers=auth
        ).json()["tasks"]
        assert created["id_task"] not in [t["id_task"] for t in inv_tasks]


class TestAssignedTasks:
    """GET /tasks/assigned (vue agregee)"""

    def test_assigned_returns_tasks_key(self, client, auth):
        """la vue agregee renvoie une cle tasks"""
        resp = client.get("/tasks/assigned", headers=auth)
        assert resp.status_code == 200
        assert "tasks" in resp.json()

    def test_assigned_unauthenticated(self, client):
        """sans authentification la vue assigned renvoie 401"""
        assert client.get("/tasks/assigned").status_code == 401
