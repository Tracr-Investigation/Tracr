"""
test_documents.py -- tests des routes documents

endpoints couverts
  GET POST /investigations/{id}/documents
  GET PATCH DELETE /documents/{id}
  GET POST /documents/{id}/comments
  POST /documents/{id}/comments/{id}/resolve
  DELETE /documents/{id}/comments/{id}
  POST GET /documents/{id}/backups
  POST /documents/{id}/backups/{id}/restore
"""
from tests.helpers import create_backup, post_comment


class TestDocumentCRUD:
    """tests crud documents"""

    def test_create_document(self, client, auth, investigation):
        """verifie qu on peut creer un document dans une investigation

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente

        Returns:
            None
        """
        resp = client.post(f"/investigations/{investigation['id_investigation']}/documents", json={"title": "Rapport initial", "content_html": "<h1>Titre</h1>"}, headers=auth)
        assert resp.status_code == 200
        assert resp.json()["title"] == "Rapport initial"
        assert "id_document" in resp.json()

    def test_create_document_empty_content(self, client, auth, investigation):
        """verifie qu un document sans contenu html est accepte

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente

        Returns:
            None
        """
        assert client.post(f"/investigations/{investigation['id_investigation']}/documents", json={"title": "Doc vide"}, headers=auth).status_code == 200

    def test_create_document_unauthenticated(self, client, investigation):
        """verifie qu un utilisateur non connecte retourne 401

        Args:
            client (TestClient): client http injecte par pytest
            investigation (dict): investigation parente

        Returns:
            None
        """
        assert client.post(f"/investigations/{investigation['id_investigation']}/documents", json={"title": "Doc"}).status_code == 401

    def test_list_documents(self, client, auth, investigation, document):
        """verifie que le document cree apparait dans la liste

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            investigation (dict): investigation parente
            document (dict): document de test cree par la fixture

        Returns:
            None
        """
        resp = client.get(f"/investigations/{investigation['id_investigation']}/documents", headers=auth)
        assert resp.status_code == 200
        assert document["id_document"] in [d["id_document"] for d in resp.json()["documents"]]

    def test_get_document(self, client, auth, document):
        """verifie qu on peut recuperer un document par son id

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            document (dict): document de test

        Returns:
            None
        """
        resp = client.get(f"/documents/{document['id_document']}", headers=auth)
        assert resp.status_code == 200
        assert resp.json()["id_document"] == document["id_document"]

    def test_get_document_not_found(self, client, auth):
        """verifie qu un id inexistant retourne 404

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer

        Returns:
            None
        """
        assert client.get("/documents/999999", headers=auth).status_code == 404

    def test_update_document(self, client, auth, document):
        """verifie que titre et contenu peuvent etre mis a jour

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            document (dict): document de test

        Returns:
            None
        """
        resp = client.patch(f"/documents/{document['id_document']}", json={"title": "Titre modifie", "content_html": "<p>Nouveau contenu</p>"}, headers=auth)
        assert resp.status_code == 200
        assert resp.json()["title"] == "Titre modifie"

    def test_update_document_content_only(self, client, auth, document):
        """verifie qu une mise a jour partielle du contenu est acceptee

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            document (dict): document de test

        Returns:
            None
        """
        assert client.patch(f"/documents/{document['id_document']}", json={"content_html": "<p>Mise a jour partielle</p>"}, headers=auth).status_code == 200

    def test_delete_document(self, client, auth, document, investigation):
        """verifie que la suppression retire le document de la liste

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            document (dict): document a supprimer
            investigation (dict): investigation parente pour verifier la liste

        Returns:
            None
        """
        doc_id = document["id_document"]
        assert client.delete(f"/documents/{doc_id}", headers=auth).status_code == 200
        ids = [d["id_document"] for d in client.get(f"/investigations/{investigation['id_investigation']}/documents", headers=auth).json()["documents"]]
        assert doc_id not in ids

    def test_delete_document_unauthorized(self, client, second_auth, document):
        """verifie qu un autre utilisateur ne peut pas supprimer le document

        Args:
            client (TestClient): client http injecte par pytest
            second_auth (dict): header authorization d un autre utilisateur
            document (dict): document appartenant au premier utilisateur

        Returns:
            None
        """
        assert client.delete(f"/documents/{document['id_document']}", headers=second_auth).status_code == 403


class TestDocumentComments:
    """tests des commentaires sur les documents"""

    def test_add_comment(self, client, auth, document):
        """verifie qu on peut ajouter un commentaire

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            document (dict): document cible

        Returns:
            None
        """
        cmt = post_comment(client, auth, document["id_document"], "cmt-001", "Mon commentaire", "texte cite")
        assert cmt["content"] == "Mon commentaire"
        assert cmt["resolved"] is False

    def test_list_comments(self, client, auth, document):
        """verifie que les commentaires crees sont listes

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            document (dict): document dont on liste les commentaires

        Returns:
            None
        """
        post_comment(client, auth, document["id_document"], "cmt-002", "Test listing")
        resp = client.get(f"/documents/{document['id_document']}/comments", headers=auth)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_resolve_comment(self, client, auth, document):
        """verifie que resolve bascule le champ resolved a true

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            document (dict): document contenant le commentaire

        Returns:
            None
        """
        doc_id = document["id_document"]
        cmt = post_comment(client, auth, doc_id, "cmt-003", "A resoudre")
        resp = client.post(f"/documents/{doc_id}/comments/{cmt['id_comment']}/resolve", headers=auth)
        assert resp.status_code == 200
        assert resp.json()["resolved"] is True

    def test_delete_comment(self, client, auth, document):
        """verifie qu on peut supprimer un commentaire

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            document (dict): document contenant le commentaire

        Returns:
            None
        """
        doc_id = document["id_document"]
        cmt = post_comment(client, auth, doc_id, "cmt-004", "A supprimer")
        assert client.delete(f"/documents/{doc_id}/comments/{cmt['id_comment']}", headers=auth).status_code == 200


class TestDocumentBackups:
    """tests de sauvegarde et restauration de documents"""

    def test_create_backup(self, client, auth, document):
        """verifie qu on peut creer un backup

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            document (dict): document a sauvegarder

        Returns:
            None
        """
        backup = create_backup(client, auth, document["id_document"])
        assert "id_backup" in backup

    def test_list_backups(self, client, auth, document):
        """verifie que le backup cree apparait dans la liste

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            document (dict): document dont on liste les backups

        Returns:
            None
        """
        create_backup(client, auth, document["id_document"])
        resp = client.get(f"/documents/{document['id_document']}/backups", headers=auth)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_restore_backup(self, client, auth, document):
        """verifie qu on peut restaurer un document depuis un backup

        Args:
            client (TestClient): client http injecte par pytest
            auth (dict): header authorization bearer
            document (dict): document de test

        Returns:
            None
        """
        doc_id = document["id_document"]
        backup = create_backup(client, auth, doc_id)
        client.patch(f"/documents/{doc_id}", json={"content_html": "<p>Modifie apres backup</p>"}, headers=auth)
        assert client.post(f"/documents/{doc_id}/backups/{backup['id_backup']}/restore", headers=auth).status_code == 200
