from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from app.database.base import Base
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.database.models.attendance import AttendanceLog
    from app.database.models.behavioral_profile import BehavioralProfile
    from app.database.models.user import User


class Faculty(Base):
    """
    Database model for faculty profiles.

    Authentication information such as login ID, password,
    role, and account status is stored in the users table.

    This table stores faculty-specific profile information
    and relationships with attendance and behavioral analytics.
    """

    __tablename__ = "faculty"

    # ============================================================
    # PRIMARY KEY
    # ============================================================

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    # ============================================================
    # USER RELATIONSHIP
    # ============================================================

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
        index=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="faculty",
    )

    # ============================================================
    # ATTENDANCE RELATIONSHIP
    # ============================================================

    attendance_logs: Mapped[list["AttendanceLog"]] = relationship(
        "AttendanceLog",
        back_populates="faculty",
        cascade="all, delete-orphan",
    )

    # ============================================================
    # BEHAVIORAL ANALYTICS RELATIONSHIP
    # ============================================================

    behavioral_profile: Mapped["BehavioralProfile | None"] = relationship(
        "BehavioralProfile",
        back_populates="faculty",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # ============================================================
    # FACULTY IDENTITY
    # ============================================================

    faculty_id: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    # ============================================================
    # PERSONAL INFORMATION
    # ============================================================

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    photo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # ============================================================
    # PROFESSIONAL INFORMATION
    # ============================================================

    department: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    designation: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # ============================================================
    # FACULTY STATUS
    # ============================================================

    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )

    # ============================================================
    # AUDIT INFORMATION
    # ============================================================

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
