"""storage_service.py -- abstraction du stockage objet (MinIO / S3).

Stocke les fichiers de capture de sources (screenshots, MHTML, medias) dans
un bucket MinIO. La base de donnees ne conserve qu'une reference (storage_key)
et l'empreinte SHA-256, jamais le binaire.

Le client est instancie paresseusement pour ne pas exiger MinIO a l'import
(utile pour les tests qui monkeypatchent put_object / get_object / remove_object).
"""
import io
from typing import Optional

from minio import Minio

from config import settings

_client: Optional[Minio] = None
_bucket_ready: bool = False


def get_client() -> Minio:
    """Retourne le client MinIO, instancie a la premiere demande.

    Returns:
        Minio: client connecte au endpoint configure.
    """
    global _client
    if _client is None:
        _client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
    return _client


def ensure_bucket() -> None:
    """Cree le bucket cible s'il n'existe pas encore (idempotent)."""
    global _bucket_ready
    if _bucket_ready:
        return
    client = get_client()
    if not client.bucket_exists(settings.MINIO_BUCKET):
        client.make_bucket(settings.MINIO_BUCKET)
    _bucket_ready = True


def put_object(object_name: str, data: bytes, content_type: str) -> None:
    """Depose un objet dans le bucket.

    Args:
        object_name (str): cle de l'objet dans le bucket.
        data (bytes): contenu binaire.
        content_type (str): type MIME de l'objet.
    """
    ensure_bucket()
    client = get_client()
    client.put_object(
        settings.MINIO_BUCKET,
        object_name,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type or "application/octet-stream",
    )


def get_object(object_name: str) -> bytes:
    """Recupere le contenu binaire d'un objet.

    Args:
        object_name (str): cle de l'objet.

    Returns:
        bytes: contenu de l'objet.
    """
    client = get_client()
    response = client.get_object(settings.MINIO_BUCKET, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def get_object_range(object_name: str, offset: int, length: int) -> bytes:
    """Recupere une plage d'octets d'un objet (requetes HTTP Range : lecture/seek
    video et audio dans le viewer).

    Args:
        object_name (str): cle de l'objet.
        offset (int): position de depart (octets).
        length (int): nombre d'octets a lire.

    Returns:
        bytes: la tranche demandee.
    """
    client = get_client()
    response = client.get_object(
        settings.MINIO_BUCKET, object_name, offset=offset, length=length
    )
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def remove_object(object_name: str) -> None:
    """Supprime un objet du bucket (silencieux si absent).

    Args:
        object_name (str): cle de l'objet.
    """
    client = get_client()
    client.remove_object(settings.MINIO_BUCKET, object_name)