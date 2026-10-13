"""
test_security_ids.py -- identifiants opaques et controle d'acces

couvre
  - tous les identifiants exposes sont des UUID (aucun entier sequentiel)
  - un identifiant mal forme est refuse (422) avant toute requete en base
  - un non-membre recoit exactement la meme 404 que pour une ressource inexistante
  - un jeton de challenge MFA n'ouvre jamais l'API
  - GET /documents/{id}/collab-access (verification du serveur Yjs)
"""
import uuid

from utils.security import create_mfa_challenge_token


def _invite_and_accept(client, owner_auth, member, inv_id, permission):
    """invite member sur l'enquete avec la permission donnee puis accepte l'invitation"""
    resp = client.post(
        f"/investigations/{inv_id}/collaborators",
        json={"pseudo": member["pseudo"], "permission_level": permission},
        headers=owner_auth,
    )
    assert resp.status_code == 200, resp.text
    collab_id = resp.json()["id_collaborator"]
    member_auth = {"Authorization": f"Bearer {member['token']}"}
    assert client.post(f"/investigations/invitations/{collab_id}/accept", headers=member_auth).status_code == 200
    return member_auth


class TestOpaqueIds:
    """les identifiants exposes par l'API sont des UUID"""

    def test_ids_are_uuids(self, client, user, investigation, document):
        """utilisateur, enquete et document portent des UUID valides"""
        for value in (user["id_user"], investigation["id_investigation"], document["id_document"]):
            assert str(uuid.UUID(str(value))) == str(value)

    def test_integer_id_rejected(self, client, auth):
        """un ancien identifiant entier est refuse par la validation (422)"""
        assert client.get("/investigations/1", headers=auth).status_code == 422
        assert client.get("/documents/1", headers=auth).status_code == 422

    def test_status_body_requires_uuid(self, client, auth, investigation):
        """le changement de statut refuse un id_status non UUID"""
        inv_id = investigation["id_investigation"]
        resp = client.patch(f"/investigations/{inv_id}/status", json={"id_status": 1}, headers=auth)
        assert resp.status_code == 422


class TestNoExistenceOracle:
    """un non-membre ne peut pas distinguer 'inexistant' de 'inaccessible'"""

    def test_investigation_same_404(self, client, auth, second_auth, investigation):
        """meme statut et meme corps pour une enquete d'autrui et une enquete inexistante"""
        other = client.get(f"/investigations/{investigation['id_investigation']}", headers=second_auth)
        missing = client.get(f"/investigations/{uuid.uuid4()}", headers=second_auth)
        assert other.status_code == missing.status_code == 404
        assert other.json() == missing.json()

    def test_document_same_404(self, client, second_auth, document):
        """meme statut et meme corps pour un document d'autrui et un document inexistant"""
        other = client.get(f"/documents/{document['id_document']}", headers=second_auth)
        missing = client.get(f"/documents/{uuid.uuid4()}", headers=second_auth)
        assert other.status_code == missing.status_code == 404
        assert other.json() == missing.json()

    def test_owner_only_action_on_foreign_investigation(self, client, second_auth, investigation):
        """une action reservee au proprietaire renvoie 404 (et non 403) a un non-membre"""
        inv_id = investigation["id_investigation"]
        assert client.post(f"/investigations/{inv_id}/transfer", json={"new_owner_pseudo": "x"}, headers=second_auth).status_code == 404

    def test_member_without_rights_gets_403(self, client, auth, second_user, investigation):
        """un membre lecteur connait l'enquete : un refus de droit reste un 403"""
        inv_id = investigation["id_investigation"]
        reader_auth = _invite_and_accept(client, auth, second_user, inv_id, "lecteur")
        assert client.delete(f"/investigations/{inv_id}", headers=reader_auth).status_code == 403


class TestMfaChallengeToken:
    """le jeton intermediaire MFA ne vaut pas une session"""

    def test_mfa_challenge_token_rejected_as_bearer(self, client, user):
        """un jeton de challenge MFA presente en Bearer est refuse (401)"""
        token = create_mfa_challenge_token(uuid.UUID(str(user["id_user"])))
        assert client.get("/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401

    def test_session_token_rejected_as_mfa_challenge(self, client, user):
        """a l'inverse, un jeton de session n'est pas accepte comme challenge MFA"""
        resp = client.post("/login/mfa", json={"mfa_token": user["token"], "code": "123456"})
        assert resp.status_code == 401


class TestCollabAccess:
    """GET /documents/{id}/collab-access, appele par le serveur Yjs avant d'ouvrir une room"""

    def test_owner_can_write(self, client, auth, document):
        """le proprietaire rejoint la room en ecriture"""
        resp = client.get(f"/documents/{document['id_document']}/collab-access", headers=auth)
        assert resp.status_code == 200
        assert resp.json() == {"read_only": False}

    def test_reader_is_read_only(self, client, auth, second_user, investigation, document):
        """un collaborateur lecteur rejoint la room en lecture seule"""
        reader_auth = _invite_and_accept(client, auth, second_user, investigation["id_investigation"], "lecteur")
        resp = client.get(f"/documents/{document['id_document']}/collab-access", headers=reader_auth)
        assert resp.status_code == 200
        assert resp.json() == {"read_only": True}

    def test_non_member_refused(self, client, second_auth, document):
        """un utilisateur authentifie mais non membre ne peut pas rejoindre la room"""
        resp = client.get(f"/documents/{document['id_document']}/collab-access", headers=second_auth)
        assert resp.status_code == 404
