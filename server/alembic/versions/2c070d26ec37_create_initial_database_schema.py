"""create initial database schema

Revision ID: 2c070d26ec37
Revises:
Create Date: 2026-08-09 18:37:19.159390

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = "2c070d26ec37"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Enable PostgreSQL pgvector extension.
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "ADMIN",
                "FACULTY",
                "STUDENT",
                name="user_role",
            ),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.Column(
            "last_login_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_users_email"),
        "users",
        ["email"],
        unique=True,
    )

    # ------------------------------------------------------------------
    # Admins
    # ------------------------------------------------------------------
    op.create_table(
        "admins",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("admin_id", sa.String(length=50), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column(
            "designation",
            sa.String(length=100),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_admins_admin_id"),
        "admins",
        ["admin_id"],
        unique=True,
    )

    op.create_index(
        op.f("ix_admins_user_id"),
        "admins",
        ["user_id"],
        unique=True,
    )

    # ------------------------------------------------------------------
    # Faculty
    # ------------------------------------------------------------------
    op.create_table(
        "faculty",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("faculty_id", sa.String(length=50), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column(
            "photo_url",
            sa.String(length=500),
            nullable=True,
        ),
        sa.Column(
            "department",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "designation",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_faculty_faculty_id"),
        "faculty",
        ["faculty_id"],
        unique=True,
    )

    op.create_index(
        op.f("ix_faculty_user_id"),
        "faculty",
        ["user_id"],
        unique=True,
    )

    # ------------------------------------------------------------------
    # Students
    # ------------------------------------------------------------------
    op.create_table(
        "students",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.String(length=50), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column(
            "photo_url",
            sa.String(length=500),
            nullable=True,
        ),
        sa.Column(
            "date_of_birth",
            sa.Date(),
            nullable=True,
        ),
        sa.Column(
            "department",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "course",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "year",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "section",
            sa.String(length=20),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_students_student_id"),
        "students",
        ["student_id"],
        unique=True,
    )

    op.create_index(
        op.f("ix_students_user_id"),
        "students",
        ["user_id"],
        unique=True,
    )

    # ------------------------------------------------------------------
    # Attendance Logs
    # ------------------------------------------------------------------
    op.create_table(
        "attendance_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "student_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "attendance_date",
            sa.Date(),
            nullable=False,
        ),
        sa.Column(
            "check_in_time",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "check_out_time",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "method",
            sa.Enum(
                "FACE",
                "NFC",
                "MANUAL",
                name="attendance_method",
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "PRESENT",
                "LATE",
                "ABSENT",
                name="attendance_status",
            ),
            nullable=False,
        ),
        sa.Column(
            "confidence_score",
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            "device_id",
            sa.String(length=100),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["students.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_attendance_logs_attendance_date"),
        "attendance_logs",
        ["attendance_date"],
        unique=False,
    )

    op.create_index(
        op.f("ix_attendance_logs_student_id"),
        "attendance_logs",
        ["student_id"],
        unique=False,
    )

    # ------------------------------------------------------------------
    # Behavioral Profiles
    # ------------------------------------------------------------------
    op.create_table(
        "behavioral_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "student_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "total_present",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "total_absent",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "total_late",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "attendance_rate",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "punctuality_score",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "consistency_score",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "risk_score",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "last_calculated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["students.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_behavioral_profiles_student_id"),
        "behavioral_profiles",
        ["student_id"],
        unique=True,
    )

    # ------------------------------------------------------------------
    # Face Embeddings
    # ------------------------------------------------------------------
    op.create_table(
        "face_embeddings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "student_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "embedding",
            Vector(512),
            nullable=False,
        ),
        sa.Column(
            "model_name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["students.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_face_embeddings_student_id"),
        "face_embeddings",
        ["student_id"],
        unique=False,
    )

    # ------------------------------------------------------------------
    # NFC Cards
    # ------------------------------------------------------------------
    op.create_table(
        "nfc_cards",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "student_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "card_uid",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
        ),
        sa.Column(
            "registered_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_used_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["student_id"],
            ["students.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_nfc_cards_card_uid"),
        "nfc_cards",
        ["card_uid"],
        unique=True,
    )

    op.create_index(
        op.f("ix_nfc_cards_student_id"),
        "nfc_cards",
        ["student_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_nfc_cards_student_id"),
        table_name="nfc_cards",
    )
    op.drop_index(
        op.f("ix_nfc_cards_card_uid"),
        table_name="nfc_cards",
    )
    op.drop_table("nfc_cards")

    op.drop_index(
        op.f("ix_face_embeddings_student_id"),
        table_name="face_embeddings",
    )
    op.drop_table("face_embeddings")

    op.drop_index(
        op.f("ix_behavioral_profiles_student_id"),
        table_name="behavioral_profiles",
    )
    op.drop_table("behavioral_profiles")

    op.drop_index(
        op.f("ix_attendance_logs_student_id"),
        table_name="attendance_logs",
    )
    op.drop_index(
        op.f("ix_attendance_logs_attendance_date"),
        table_name="attendance_logs",
    )
    op.drop_table("attendance_logs")

    op.drop_index(
        op.f("ix_students_user_id"),
        table_name="students",
    )
    op.drop_index(
        op.f("ix_students_student_id"),
        table_name="students",
    )
    op.drop_table("students")

    op.drop_index(
        op.f("ix_faculty_user_id"),
        table_name="faculty",
    )
    op.drop_index(
        op.f("ix_faculty_faculty_id"),
        table_name="faculty",
    )
    op.drop_table("faculty")

    op.drop_index(
        op.f("ix_admins_user_id"),
        table_name="admins",
    )
    op.drop_index(
        op.f("ix_admins_admin_id"),
        table_name="admins",
    )
    op.drop_table("admins")

    op.drop_index(
        op.f("ix_users_email"),
        table_name="users",
    )
    op.drop_table("users")
