"""add faculty attendance support

Revision ID: 110fa304c704
Revises: 524ae4f23861
Create Date: 2026-08-10
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "110fa304c704"
down_revision = "524ae4f23861"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------
    # 1. Make student_id nullable
    #
    # Existing student attendance records are preserved.
    # ------------------------------------------------------------

    op.alter_column(
        "attendance_logs",
        "student_id",
        existing_type=sa.UUID(),
        nullable=True,
    )

    # ------------------------------------------------------------
    # 2. Add faculty_id
    # ------------------------------------------------------------

    op.add_column(
        "attendance_logs",
        sa.Column(
            "faculty_id",
            sa.UUID(),
            nullable=True,
        ),
    )

    # ------------------------------------------------------------
    # 3. Create faculty foreign key
    # ------------------------------------------------------------

    op.create_foreign_key(
        "fk_attendance_logs_faculty_id",
        "attendance_logs",
        "faculty",
        ["faculty_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # ------------------------------------------------------------
    # 4. Create faculty attendance index
    # ------------------------------------------------------------

    op.create_index(
        "ix_attendance_logs_faculty_id",
        "attendance_logs",
        ["faculty_id"],
        unique=False,
    )

    # ------------------------------------------------------------
    # 5. Ensure exactly one person owns each attendance record
    #
    # Student:
    #   student_id = UUID
    #   faculty_id = NULL
    #
    # Faculty:
    #   student_id = NULL
    #   faculty_id = UUID
    #
    # Admin:
    #   Not allowed.
    # ------------------------------------------------------------

    op.create_check_constraint(
        "attendance_one_person_type",
        "attendance_logs",
        """
        (
            student_id IS NOT NULL
            AND faculty_id IS NULL
        )
        OR
        (
            student_id IS NULL
            AND faculty_id IS NOT NULL
        )
        """,
    )


def downgrade() -> None:
    # ------------------------------------------------------------
    # Remove check constraint
    # ------------------------------------------------------------

    op.drop_constraint(
        "attendance_one_person_type",
        "attendance_logs",
        type_="check",
    )

    # ------------------------------------------------------------
    # Remove faculty index
    # ------------------------------------------------------------

    op.drop_index(
        "ix_attendance_logs_faculty_id",
        table_name="attendance_logs",
    )

    # ------------------------------------------------------------
    # Remove faculty foreign key
    # ------------------------------------------------------------

    op.drop_constraint(
        "fk_attendance_logs_faculty_id",
        "attendance_logs",
        type_="foreignkey",
    )

    # ------------------------------------------------------------
    # Remove faculty_id
    # ------------------------------------------------------------

    op.drop_column(
        "attendance_logs",
        "faculty_id",
    )

    # ------------------------------------------------------------
    # Restore student_id NOT NULL
    #
    # This downgrade is only safe if no faculty attendance
    # records exist.
    # ------------------------------------------------------------

    op.alter_column(
        "attendance_logs",
        "student_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
