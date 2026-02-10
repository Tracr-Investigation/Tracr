from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlmodel import Session, create_engine
from config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

limiter = Limiter(key_func=get_remote_address)


def get_db():
    with Session(engine) as session:
        yield session
