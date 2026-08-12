from __future__ import annotations

import os
from typing import Any
from urllib.parse import unquote, urlparse

import psycopg
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/calendar",
    tags=["Calendar"],
)


# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================


def get_database_url() -> str:
    """
    Read DATABASE_URL from the environment.

    Supports both:

        postgresql://...
        postgresql+psycopg://...

    The SQLAlchemy-style +psycopg suffix is removed before
    parsing because this module connects directly with psycopg.
    """

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured.")

    database_url = database_url.strip()

    # Convert SQLAlchemy URL to normal PostgreSQL URL.
    if database_url.startswith("postgresql+psycopg://"):
        database_url = database_url.replace(
            "postgresql+psycopg://",
            "postgresql://",
            1,
        )

    elif database_url.startswith("postgresql+psycopg2://"):
        database_url = database_url.replace(
            "postgresql+psycopg2://",
            "postgresql://",
            1,
        )

    return database_url


def get_database_connection():
    """
    Create a psycopg connection using individual connection parameters.

    This avoids passing SQLAlchemy-style URLs directly to psycopg.connect().
    """

    database_url = get_database_url()

    parsed = urlparse(database_url)

    if parsed.scheme not in {
        "postgresql",
        "postgres",
    }:
        raise RuntimeError(
            "Invalid DATABASE_URL scheme. Use postgresql:// or postgresql+psycopg://"
        )

    if not parsed.hostname:
        raise RuntimeError("DATABASE_URL does not contain a valid database host.")

    if not parsed.path or parsed.path == "/":
        raise RuntimeError("DATABASE_URL does not contain a database name.")

    database = parsed.path.lstrip("/")

    username = unquote(parsed.username) if parsed.username else None

    password = unquote(parsed.password) if parsed.password else None

    host = parsed.hostname

    port = parsed.port if parsed.port else 5432

    return psycopg.connect(
        host=host,
        port=port,
        dbname=database,
        user=username,
        password=password,
    )


# ============================================================================
# MODELS
# ============================================================================


class HolidayCreate(BaseModel):
    date: str = Field(
        ...,
        description="Holiday date in YYYY-MM-DD format",
    )

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    holiday_type: str = Field(
        default="public",
        description="public, national, or college",
    )

    description: str | None = None

    is_active: bool = True


class HolidayResponse(BaseModel):
    id: int
    date: str
    name: str
    holiday_type: str
    description: str | None
    is_active: bool


# ============================================================================
# DATABASE INITIALIZATION
# ============================================================================


def ensure_holidays_table() -> None:
    """
    Create the holidays table if it does not already exist.
    """

    try:
        with get_database_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS holidays (
                        id SERIAL PRIMARY KEY,

                        date DATE NOT NULL,

                        name VARCHAR(255) NOT NULL,

                        holiday_type VARCHAR(30)
                            NOT NULL DEFAULT 'public',

                        description TEXT,

                        is_active BOOLEAN
                            NOT NULL DEFAULT TRUE,

                        created_at TIMESTAMPTZ
                            NOT NULL DEFAULT NOW(),

                        updated_at TIMESTAMPTZ
                            NOT NULL DEFAULT NOW(),

                        CONSTRAINT holidays_unique_date_name
                            UNIQUE (date, name)
                    )
                    """
                )

                cursor.execute(
                    """
                    CREATE INDEX IF NOT EXISTS
                    idx_holidays_date
                    ON holidays(date)
                    """
                )

                cursor.execute(
                    """
                    CREATE INDEX IF NOT EXISTS
                    idx_holidays_active_date
                    ON holidays(is_active, date)
                    """
                )

            connection.commit()

    except psycopg.Error as exc:
        raise RuntimeError(f"Unable to initialize holidays table: {exc}") from exc


# ============================================================================
# INITIAL 2026 HOLIDAYS
# ============================================================================


def seed_2026_holidays() -> None:
    """
    Insert the initial 2026 holiday calendar.

    ON CONFLICT DO NOTHING ensures existing records are not overwritten.
    """

    holidays_2026 = [
        (
            "2026-01-14",
            "Makar Sankranti",
            "public",
            "Makar Sankranti / Pongal",
        ),
        (
            "2026-01-26",
            "Republic Day",
            "national",
            "Republic Day of India",
        ),
        (
            "2026-03-04",
            "Holi",
            "public",
            "Holi",
        ),
        (
            "2026-03-19",
            "Ugadi",
            "college",
            "Ugadi / Telugu New Year",
        ),
        (
            "2026-03-21",
            "Id-ul-Fitr",
            "public",
            "Eid al-Fitr",
        ),
        (
            "2026-03-26",
            "Ram Navami",
            "public",
            "Ram Navami",
        ),
        (
            "2026-03-31",
            "Mahavir Jayanti",
            "public",
            "Mahavir Jayanti",
        ),
        (
            "2026-04-03",
            "Good Friday",
            "public",
            "Good Friday",
        ),
        (
            "2026-05-01",
            "Buddha Purnima",
            "public",
            "Buddha Purnima",
        ),
        (
            "2026-05-27",
            "Id-ul-Zuha",
            "public",
            "Bakrid / Eid al-Adha",
        ),
        (
            "2026-06-26",
            "Muharram",
            "public",
            "Muharram",
        ),
        (
            "2026-08-15",
            "Independence Day",
            "national",
            "Independence Day of India",
        ),
        (
            "2026-08-26",
            "Milad-un-Nabi",
            "public",
            "Prophet Mohammad's Birthday",
        ),
        (
            "2026-09-04",
            "Janmashtami",
            "public",
            "Krishna Janmashtami",
        ),
        (
            "2026-09-14",
            "Ganesh Chaturthi",
            "college",
            "Ganesh Chaturthi / Vinayaka Chaturthi",
        ),
        (
            "2026-10-02",
            "Gandhi Jayanti",
            "national",
            "Mahatma Gandhi's Birthday",
        ),
        (
            "2026-10-20",
            "Dussehra",
            "public",
            "Dussehra / Vijayadashami",
        ),
        (
            "2026-11-08",
            "Diwali",
            "public",
            "Diwali / Deepavali",
        ),
        (
            "2026-11-24",
            "Guru Nanak Jayanti",
            "public",
            "Guru Nanak's Birthday",
        ),
        (
            "2026-12-25",
            "Christmas Day",
            "public",
            "Christmas Day",
        ),
    ]

    try:
        with get_database_connection() as connection:
            with connection.cursor() as cursor:
                for (
                    date,
                    name,
                    holiday_type,
                    description,
                ) in holidays_2026:
                    cursor.execute(
                        """
                        INSERT INTO holidays (
                            date,
                            name,
                            holiday_type,
                            description
                        )
                        VALUES (
                            %s,
                            %s,
                            %s,
                            %s
                        )
                        ON CONFLICT (
                            date,
                            name
                        )
                        DO NOTHING
                        """,
                        (
                            date,
                            name,
                            holiday_type,
                            description,
                        ),
                    )

            connection.commit()

    except psycopg.Error as exc:
        raise RuntimeError(f"Unable to seed holidays: {exc}") from exc


# ============================================================================
# GET HOLIDAYS
# ============================================================================


@router.get(
    "/holidays",
    response_model=list[HolidayResponse],
)
def get_holidays(
    year: int = Query(
        ...,
        ge=2000,
        le=2100,
    ),
) -> list[HolidayResponse]:

    try:
        # Make sure the table exists.
        ensure_holidays_table()

        # Insert initial 2026 data.
        if year == 2026:
            seed_2026_holidays()

        # Retrieve holidays.
        with get_database_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        id,
                        date,
                        name,
                        holiday_type,
                        description,
                        is_active
                    FROM holidays
                    WHERE EXTRACT(
                        YEAR FROM date
                    ) = %s
                    AND is_active = TRUE
                    ORDER BY date ASC
                    """,
                    (year,),
                )

                rows = cursor.fetchall()

        return [
            HolidayResponse(
                id=row[0],
                date=row[1].isoformat(),
                name=row[2],
                holiday_type=row[3],
                description=row[4],
                is_active=row[5],
            )
            for row in rows
        ]

    except psycopg.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {exc}",
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================================
# CREATE HOLIDAY
# ============================================================================


@router.post(
    "/holidays",
    response_model=HolidayResponse,
    status_code=201,
)
def create_holiday(
    holiday: HolidayCreate,
) -> HolidayResponse:

    try:
        ensure_holidays_table()

        with get_database_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO holidays (
                        date,
                        name,
                        holiday_type,
                        description,
                        is_active
                    )
                    VALUES (
                        %s,
                        %s,
                        %s,
                        %s,
                        %s
                    )
                    RETURNING
                        id,
                        date,
                        name,
                        holiday_type,
                        description,
                        is_active
                    """,
                    (
                        holiday.date,
                        holiday.name,
                        holiday.holiday_type,
                        holiday.description,
                        holiday.is_active,
                    ),
                )

                row = cursor.fetchone()

            connection.commit()

        if row is None:
            raise HTTPException(
                status_code=500,
                detail="Holiday was not created.",
            )

        return HolidayResponse(
            id=row[0],
            date=row[1].isoformat(),
            name=row[2],
            holiday_type=row[3],
            description=row[4],
            is_active=row[5],
        )

    except psycopg.errors.UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail=("A holiday with the same date and name already exists."),
        )

    except psycopg.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {exc}",
        ) from exc


# ============================================================================
# DELETE HOLIDAY
# ============================================================================


@router.delete(
    "/holidays/{holiday_id}",
)
def delete_holiday(
    holiday_id: int,
) -> dict[str, Any]:

    try:
        ensure_holidays_table()

        with get_database_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    DELETE FROM holidays
                    WHERE id = %s
                    RETURNING id
                    """,
                    (holiday_id,),
                )

                deleted = cursor.fetchone()

            connection.commit()

        if deleted is None:
            raise HTTPException(
                status_code=404,
                detail="Holiday not found.",
            )

        return {
            "success": True,
            "message": ("Holiday deleted successfully."),
            "id": holiday_id,
        }

    except HTTPException:
        raise

    except psycopg.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {exc}",
        ) from exc
