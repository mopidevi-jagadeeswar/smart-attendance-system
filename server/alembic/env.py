from __future__ import annotations

import os
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

# ============================================================
# LOAD ENVIRONMENT
# ============================================================

# server/
# ├── .env
# └── alembic/
#     └── env.py

BASE_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BASE_DIR / ".env")


# ============================================================
# ALEMBIC CONFIGURATION
# ============================================================

config = context.config


# ============================================================
# LOGGING
# ============================================================

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# ============================================================
# DATABASE URL
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not configured. Please define DATABASE_URL in server/.env"
    )

# Alembic's default configuration contains a placeholder URL.
# Override it with the URL from .env.
config.set_main_option(
    "sqlalchemy.url",
    DATABASE_URL.replace("%", "%%"),
)


# ============================================================
# SQLALCHEMY MODELS
# ============================================================

from app.database.base import Base

# Import every model so SQLAlchemy registers all tables
# with Base.metadata before Alembic autogeneration.
from app.database.models.admin import Admin  # noqa: F401
from app.database.models.attendance import AttendanceLog  # noqa: F401
from app.database.models.behavioral_profile import BehavioralProfile  # noqa: F401
from app.database.models.face_embedding import FaceEmbedding  # noqa: F401
from app.database.models.faculty import Faculty  # noqa: F401
from app.database.models.nfc_card import NFCCard  # noqa: F401
from app.database.models.student import Student  # noqa: F401
from app.database.models.user import User  # noqa: F401


# Alembic uses this metadata for autogenerate.
target_metadata = Base.metadata


# ============================================================
# OFFLINE MIGRATIONS
# ============================================================


def run_migrations_offline() -> None:
    """
    Run migrations without creating a database connection.

    This generates SQL suitable for review or manual execution.
    """

    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named",
        },
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ============================================================
# ONLINE MIGRATIONS
# ============================================================


def run_migrations_online() -> None:
    """
    Run migrations using a live database connection.
    """

    configuration = config.get_section(
        config.config_ini_section,
        {},
    )

    if configuration is None:
        raise RuntimeError("Unable to load Alembic configuration.")

    configuration["sqlalchemy.url"] = DATABASE_URL

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


# ============================================================
# RUN
# ============================================================

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
