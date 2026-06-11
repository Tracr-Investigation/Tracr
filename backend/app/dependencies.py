from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlmodel import Session, create_engine
from config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

# Limiter desactivable via RATE_LIMIT_ENABLED=false (utile pour les tests E2E)
limiter = Limiter(key_func=get_remote_address, enabled=settings.RATE_LIMIT_ENABLED)


def get_db():
    with Session(engine) as session:
        yield session
