from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from app.database.base import Base
from sqlalchemy import DateTime, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.database.models.admin import Admin
    from app.database.models.face_embedding import FaceEmbedding
    from app.database.models.faculty import Faculty
    from app.database.models.student import Student


# ============================================================
# USER ROLE
# ============================================================


class UserRole(str, Enum):
    """Roles supported by the application."""

    ADMIN = "admin"
    FACULTY = "faculty"
    STUDENT = "student"


# ============================================================
# USER MODEL
# ============================================================


class User(Base):
    """
    Database model for application users.

    Stores authentication, authorization, account status,
    face-recognition relationships, and account audit
    information.
    """

    __tablename__ = "users"

    # ========================================================
    # PRIMARY KEY
    # ========================================================

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    # ========================================================
    # AUTHENTICATION
    # ========================================================

    login_id: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # ========================================================
    # CONTACT INFORMATION
    # ========================================================

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    # ========================================================
    # AUTHORIZATION
    # ========================================================

    role: Mapped[UserRole] = mapped_column(
        SQLEnum(
            UserRole,
            name="user_role",
        ),
        nullable=False,
        index=True,
    )

    # ========================================================
    # ACCOUNT STATUS
    # ========================================================

    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )

    is_verified: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )

    # ========================================================
    # LOGIN INFORMATION
    # ========================================================

    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ========================================================
    # AUDIT INFORMATION
    # ========================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ========================================================
    # ADMIN RELATIONSHIP
    # ========================================================

    admin: Mapped["Admin | None"] = relationship(
        "Admin",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # ========================================================
    # STUDENT RELATIONSHIP
    # ========================================================

    student: Mapped["Student | None"] = relationship(
        "Student",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # ========================================================
    # FACULTY RELATIONSHIP
    # ========================================================

    faculty: Mapped["Faculty | None"] = relationship(
        "Faculty",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # ========================================================
    # FACE EMBEDDINGS
    # ========================================================
    #
    # One user can have multiple face embeddings.
    #
    # Our enrollment process:
    #
    # Student:
    #   Photo 1 → embedding
    #   Photo 2 → embedding
    #   Photo 3 → embedding
    #   Photo 4 → embedding
    #   Photo 5 → embedding
    #
    # Faculty:
    #   Photo 1 → embedding
    #   Photo 2 → embedding
    #   Photo 3 → embedding
    #   Photo 4 → embedding
    #   Photo 5 → embedding
    #
    # FaceEmbedding.user_id → users.id
    #
    # Deleting a user also deletes their embeddings.
    # ========================================================

    face_embeddings: Mapped[list["FaceEmbedding"]] = relationship(
        "FaceEmbedding",
        back_populates="user",
        cascade="all, delete-orphan",
    )
