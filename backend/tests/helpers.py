"""
helpers.py -- fonctions utilitaires partagees par les tests

raccourcis pour construire des headers d auth et appeler les routes
courantes (taches, reponses) sans repeter la plomberie http
"""
from fastapi.testclient import TestClient


def auth_header(user: dict) -> dict:
    """construit le header authorization bearer pour un utilisateur

    Args:
        user (dict): utilisateur avec une cle token

    Returns:
        dict: header http authorization bearer
    """
    return {"Authorization": f"Bearer {user['token']}"}


def patch_task(client: TestClient, auth: dict, inv_id: int, task_id: int, payload: dict):
    """met a jour une tache et retourne la reponse http

    Args:
        client (TestClient): client http injecte par pytest
        auth (dict): header authorization bearer
        inv_id (int): identifiant de l investigation
        task_id (int): identifiant de la tache
        payload (dict): champs a mettre a jour

    Returns:
        Response: reponse http
    """
    return client.patch(f"/investigations/{inv_id}/tasks/{task_id}", json=payload, headers=auth)


def post_task_response(client: TestClient, auth: dict, inv_id: int, task_id: int, content: str) -> dict:
    """cree une reponse a une tache et retourne son json

    Args:
        client (TestClient): client http injecte par pytest
        auth (dict): header authorization bearer
        inv_id (int): identifiant de l investigation
        task_id (int): identifiant de la tache
        content (str): contenu de la reponse

    Returns:
        dict: donnees de la reponse creee
    """
    return client.post(f"/investigations/{inv_id}/tasks/{task_id}/responses", json={"content": content}, headers=auth).json()


def post_comment(client: TestClient, auth: dict, doc_id: int, comment_id: str, content: str, quote: str = "") -> dict:
    """cree un commentaire sur un document et retourne son json

    Args:
        client (TestClient): client http injecte par pytest
        auth (dict): header authorization bearer
        doc_id (int): identifiant du document
        comment_id (str): identifiant unique du commentaire
        content (str): contenu du commentaire
        quote (str): texte cite optionnel

    Returns:
        dict: donnees du commentaire cree
    """
    return client.post(f"/documents/{doc_id}/comments", json={"comment_id": comment_id, "quote": quote, "content": content}, headers=auth).json()


def create_backup(client: TestClient, auth: dict, doc_id: int) -> dict:
    """cree un backup d un document et retourne son json

    Args:
        client (TestClient): client http injecte par pytest
        auth (dict): header authorization bearer
        doc_id (int): identifiant du document

    Returns:
        dict: donnees du backup cree
    """
    return client.post(f"/documents/{doc_id}/backups", headers=auth).json()
