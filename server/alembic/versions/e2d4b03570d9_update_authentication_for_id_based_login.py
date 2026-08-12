"""update authentication for id based login

Revision ID: e2d4b03570d9
Revises: 2c070d26ec37
Create Date: 2026-08-09 22:06:13.282814

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e2d4b03570d9"
down_revision: Union[str, Sequence[str], None] = "2c070d26ec37"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ------------------------------------------------------------------
    # 1. Add login_id temporarily as nullable
    # ------------------------------------------------------------------

    op.add_column(
        "users",
        sa.Column(
            "login_id",
            sa.String(length=50),
            nullable=True,
        ),
    )

    # ------------------------------------------------------------------
    # 2. Generate login IDs for existing users
    # ------------------------------------------------------------------

    connection = op.get_bind()

    users = connection.execute(
        sa.text(
            """
            SELECT id, role
            FROM users
            ORDER BY created_at, id
            """
        )
    ).fetchall()

    counters = {
        "student": 0,
        "faculty": 0,
        "admin": 0,
    }

    for user in users:
        role = user.role.value if hasattr(user.role, "value") else str(user.role)

        role = role.lower()

        if role == "student":
            counters["student"] += 1
            login_id = f"STU{counters['student']:03d}"

        elif role == "faculty":
            counters["faculty"] += 1
            login_id = f"FAC{counters['faculty']:03d}"

        elif role == "admin":
            counters["admin"] += 1
            login_id = f"ADM{counters['admin']:03d}"

        else:
            raise RuntimeError(f"Unsupported user role found during migration: {role}")

        connection.execute(
            sa.text(
                """
                UPDATE users
                SET login_id = :login_id
                WHERE id = :user_id
                """
            ),
            {
                "login_id": login_id,
                "user_id": user.id,
            },
        )

    # ------------------------------------------------------------------
    # 3. Make login_id required
    # ------------------------------------------------------------------

    op.alter_column(
        "users",
        "login_id",
        existing_type=sa.String(length=50),
        nullable=False,
    )

    # ------------------------------------------------------------------
    # 4. Unique login ID index
    # ------------------------------------------------------------------

    op.create_index(
        op.f("ix_users_login_id"),
        "users",
        ["login_id"],
        unique=True,
    )

    # ------------------------------------------------------------------
    # 5. Role index
    # ------------------------------------------------------------------

    op.create_index(
        op.f("ix_users_role"),
        "users",
        ["role"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    # ------------------------------------------------------------------
    # Remove role index
    # ------------------------------------------------------------------

    op.drop_index(
        op.f("ix_users_role"),
        table_name="users",
    )

    # ------------------------------------------------------------------
    # Remove login ID index
    # ------------------------------------------------------------------

    op.drop_index(
        op.f("ix_users_login_id"),
        table_name="users",
    )

    # ------------------------------------------------------------------
    # Remove login ID column
    # ------------------------------------------------------------------

    op.drop_column(
        "users",
        "login_id",
    )
