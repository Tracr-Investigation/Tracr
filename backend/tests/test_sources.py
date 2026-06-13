"""
test_sources.py -- tests des routes d'archivage de sources (preuves OSINT)

endpoints couverts
  GET  POST   /investigations/{id}/sources
  GET         /sources/{id}
  GET         /sources/{id}/download
  DELETE      /sources/{id}

Le stockage MinIO est remplace par un dictionnaire en memoire (fixture
fake_storage) pour que les tests n'aient pas besoin d'un MinIO live.
"""
import hashlib

import pytest

from services import storage_service

PNG_BYTES = b"\x89PNG\r\n\x1a\n fake png content for tests"


@pytest.fixture(autouse=True)
def fake_storage(monkeypatch):
    """Remplace le backend MinIO par un store en memoire.

    Yields:
        dict: store object_name -> bytes, inspectable par les tests.
    """
    store: dict[str, bytes] = {}

    monkeypatch.setattr(storage_service, "put_object",
                        lambda object_name, data, content_type: store.__setitem__(object_name, data))
    monkeypatch.setattr(storage_service, "get_object",
                        lambda object_name: store[object_name])
    monkeypatch.setattr(storage_service, "remove_object",
                        lambda object_name: store.pop(object_name, None))
    return store


def _upload(client, auth, inv_id, content=PNG_BYTES, source_type="page_screenshot",
            title="Capture test", source_url="https://example.com/article",
            mime="image/png", **extra):
    """Depose une source via multipart et retourne la reponse http."""
    data = {"title": title, "source_url": source_url, "source_type": source_type}
    data.update(extra)
    files = {"file": ("capture.png", content, mime)}
    return client.post(f"/investigations/{inv_id}/sources", data=data, files=files, headers=auth)


class TestSourceCreate:
    """tests de depot de sources"""

    def test_create_source(self, client, auth, investigation):
        """une capture valide est acceptee et renvoie ses metadonnees"""
        resp = _upload(client, auth, investigation["id_investigation"])
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["title"] == "Capture test"
        assert body["source_type"] == "page_screenshot"
        assert body["size_bytes"] == len(PNG_BYTES)
        assert "id_source" in body

    def test_content_hash_is_correct(self, client, auth, investigation):
        """l'empreinte SHA-256 renvoyee correspond au contenu envoye"""
        resp = _upload(client, auth, investigation["id_investigation"])
        expected = hashlib.sha256(PNG_BYTES).hexdigest()
        assert resp.json()["content_hash"] == expected

    def test_binary_stored_in_backend(self, client, auth, investigation, fake_storage):
        """le binaire est bien depose dans le stockage objet"""
        _upload(client, auth, investigation["id_investigation"])
        assert PNG_BYTES in fake_storage.values()

    def test_custom_captured_at(self, client, auth, investigation):
        """l'horodatage client fourni est conserve (meme instant, tz normalisee)"""
        sent = "2026-01-15T10:30:00+01:00"
        resp = _upload(client, auth, investigation["id_investigation"], captured_at=sent)
        assert resp.status_code == 200
        from datetime import datetime
        assert datetime.fromisoformat(resp.json()["captured_at"]) == datetime.fromisoformat(sent)

    def test_invalid_type_rejected(self, client, auth, investigation):
        """un source_type inconnu renvoie 422"""
        resp = _upload(client, auth, investigation["id_investigation"], source_type="bogus")
        assert resp.status_code == 422

    def test_web_archive_type_accepted(self, client, auth, investigation):
        """le type web_archive (page HTML autonome) est accepte"""
        resp = _upload(client, auth, investigation["id_investigation"],
                       source_type="web_archive", mime="text/html",
                       content=b"<!DOCTYPE html><html><body>snapshot</body></html>")
        assert resp.status_code == 200, resp.text
        assert resp.json()["source_type"] == "web_archive"

    def test_invalid_captured_at_rejected(self, client, auth, investigation):
        """un horodatage non ISO renvoie 422"""
        resp = _upload(client, auth, investigation["id_investigation"], captured_at="pas-une-date")
        assert resp.status_code == 422

    def test_create_unauthenticated(self, client, investigation):
        """sans token, depot refuse 401"""
        files = {"file": ("c.png", PNG_BYTES, "image/png")}
        data = {"title": "x", "source_url": "https://e.com", "source_type": "media"}
        resp = client.post(f"/investigations/{investigation['id_investigation']}/sources",
                           data=data, files=files)
        assert resp.status_code == 401

    def test_create_non_member_forbidden(self, client, second_auth, investigation):
        """un non-membre de l'enquete ne peut pas deposer 403"""
        resp = _upload(client, second_auth, investigation["id_investigation"])
        assert resp.status_code == 403

    def test_capture_group_links_captures(self, client, auth, investigation):
        """screenshot + mhtml d'une meme page partagent le capture_group"""
        gid = "11111111-1111-1111-1111-111111111111"
        r1 = _upload(client, auth, investigation["id_investigation"],
                     source_type="page_screenshot", capture_group=gid)
        r2 = _upload(client, auth, investigation["id_investigation"],
                     source_type="page_mhtml", mime="multipart/related", capture_group=gid)
        assert r1.json()["capture_group"] == gid
        assert r2.json()["capture_group"] == gid


class TestSourceRead:
    """tests de lecture / liste / telechargement"""

    def test_list_sources(self, client, auth, investigation):
        """la source creee apparait dans la liste"""
        created = _upload(client, auth, investigation["id_investigation"]).json()
        resp = client.get(f"/investigations/{investigation['id_investigation']}/sources", headers=auth)
        assert resp.status_code == 200
        ids = [s["id_source"] for s in resp.json()["sources"]]
        assert created["id_source"] in ids

    def test_get_source_detail(self, client, auth, investigation):
        """on recupere une source par son id"""
        created = _upload(client, auth, investigation["id_investigation"]).json()
        resp = client.get(f"/sources/{created['id_source']}", headers=auth)
        assert resp.status_code == 200
        assert resp.json()["id_source"] == created["id_source"]

    def test_download_returns_binary(self, client, auth, investigation):
        """le telechargement renvoie exactement le binaire stocke"""
        created = _upload(client, auth, investigation["id_investigation"]).json()
        resp = client.get(f"/sources/{created['id_source']}/download", headers=auth)
        assert resp.status_code == 200
        assert resp.content == PNG_BYTES
        assert resp.headers["content-type"].startswith("image/png")

    def test_get_source_non_member_forbidden(self, client, auth, second_auth, investigation):
        """un non-membre ne peut pas lire une source 403"""
        created = _upload(client, auth, investigation["id_investigation"]).json()
        resp = client.get(f"/sources/{created['id_source']}", headers=second_auth)
        assert resp.status_code == 403

    def test_get_missing_source_404(self, client, auth, investigation):
        """une source inexistante renvoie 404"""
        assert client.get("/sources/999999", headers=auth).status_code == 404


class TestSourceDelete:
    """tests de suppression"""

    def test_delete_source(self, client, auth, investigation, fake_storage):
        """l'owner supprime la source et son objet de stockage"""
        created = _upload(client, auth, investigation["id_investigation"]).json()
        resp = client.delete(f"/sources/{created['id_source']}", headers=auth)
        assert resp.status_code == 200
        # objet retire du stockage
        assert PNG_BYTES not in fake_storage.values()
        # source absente de la liste
        listed = client.get(f"/investigations/{investigation['id_investigation']}/sources", headers=auth).json()
        assert created["id_source"] not in [s["id_source"] for s in listed["sources"]]

    def test_delete_non_member_forbidden(self, client, auth, second_auth, investigation):
        """un non-membre ne peut pas supprimer 403"""
        created = _upload(client, auth, investigation["id_investigation"]).json()
        resp = client.delete(f"/sources/{created['id_source']}", headers=second_auth)
        assert resp.status_code == 403
