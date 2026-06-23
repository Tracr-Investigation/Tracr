from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # PostgreSQL
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # Database URL
    DATABASE_URL: str
    REDIS_URL: str

    # FastAPI
    SECRET_KEY: str
    DEBUG: bool = False
    JWT_EXPIRATION_HOURS: int = 24

    MFA_ENCRYPTION_KEY: str | None = None

    RATE_LIMIT_ENABLED: bool = True

    # MinIO / stockage objet des captures de sources
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "tracr"
    MINIO_SECRET_KEY: str = "tracr_password_2024"
    MINIO_BUCKET: str = "tracr-sources"
    MINIO_SECURE: bool = False
    MAX_SOURCE_SIZE_MB: int = 200

    # Mise à jour du code depuis GitHub (admin)
    GITHUB_REPO: str = "Tracr-Investigation/Tracr"
    GITHUB_BRANCH: str = "main"
    GITHUB_TOKEN: str | None = None
    # SHA du commit déployé (fallback si le fichier d'état partagé est absent)
    GIT_SHA: str | None = None
    # Fichier d'état partagé écrit par l'agent hôte (Phase 2)
    UPDATE_STATE_FILE: str = "/app/update/state.json"

    class Config:
        env_file = "../.env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()