from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlmodel import SQLModel
import models  # noqa: F401 - nécessaire pour que Alembic détecte tous les modèles
from config import settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Surcharge de l'URL de connexion avec la variable d'environnement DATABASE_URL
# Évite de stocker des mots de passe dans alembic.ini
# Ajout de client_encoding pour éviter les UnicodeDecodeError sur Windows
db_url = settings.DATABASE_URL
if "client_encoding" not in db_url:
    sep = "&" if "?" in db_url else "?"
    db_url = f"{db_url}{sep}client_encoding=utf8"
config.set_main_option("sqlalchemy.url", db_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = SQLModel.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Goal: run migrations offline (emit SQL from the URL, no DB connection).

    Input: none (reads the Alembic config). Output: None.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Goal: run migrations online (open an Engine and execute against the DB).

    Input: none (reads the Alembic config). Output: None.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
