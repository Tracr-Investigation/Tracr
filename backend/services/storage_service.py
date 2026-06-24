"""storage_service.py -- object storage abstraction (MinIO / S3).

Stores source capture files (screenshots, MHTML, media) in a MinIO bucket; the DB keeps only a reference (storage_key) and the SHA-256, never the binary. The client is lazily instantiated so MinIO isn't required at import (tests monkeypatch put_object / get_object / remove_object).
"""
import io
from typing import Optional

from minio import Minio

from config import settings

_client: Optional[Minio] = None
_bucket_ready: bool = False


def get_client() -> Minio:
    """Goal: return the MinIO client, instantiated on first use. Input: none. Output: connected Minio client."""
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
    """Goal: create the target bucket if missing (idempotent). Input: none. Output: None."""
    global _bucket_ready
    if _bucket_ready:
        return
    client = get_client()
    if not client.bucket_exists(settings.MINIO_BUCKET):
        client.make_bucket(settings.MINIO_BUCKET)
    _bucket_ready = True


def put_object(object_name: str, data: bytes, content_type: str) -> None:
    """Goal: store an object in the bucket. Input: object_name, data (bytes), content_type. Output: None."""
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
    """Goal: read an object's full binary content. Input: object_name. Output: bytes."""
    client = get_client()
    response = client.get_object(settings.MINIO_BUCKET, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def get_object_range(object_name: str, offset: int, length: int) -> bytes:
    """Goal: read a byte range of an object (HTTP Range for video/audio seek). Input: object_name, offset, length. Output: bytes."""
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
    """Goal: delete an object from the bucket. Input: object_name. Output: None."""
    client = get_client()
    client.remove_object(settings.MINIO_BUCKET, object_name)