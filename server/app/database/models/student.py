from datetime import date, datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from app.database.base import Base
from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.database.models.attendance import AttendanceLog
    from app.database.models.behavioral_profile import BehavioralProfile
    from app.database.models.nfc_card import NFCCard
    from app.database.models.user import User


class Student(Base):
    """
    Database model for student profiles.

    Authentication information such as login ID, password,
    role, and account status is stored in the users table.

    This table stores student-specific personal, academic,
    and profile information.
    """

    __tablename__ = "students"

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
        back_populates="student",
    )

    # ============================================================
    # STUDENT IDENTITY
    # ============================================================

    student_id: Mapped[str] = mapped_column(
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

    date_of_birth: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    gender: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    # ============================================================
    # PROFILE IMAGE
    # ============================================================

    photo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # ============================================================
    # ACADEMIC INFORMATION
    # ============================================================

    department: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    course: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    year: Mapped[int] = mapped_column(
        nullable=False,
    )

    semester: Mapped[int | None] = mapped_column(
        nullable=True,
    )

    section: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    # ============================================================
    # STUDENT STATUS
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

    # ============================================================
    # STUDENT RELATIONSHIPS
    # ============================================================

    nfc_cards: Mapped[list["NFCCard"]] = relationship(
        "NFCCard",
        back_populates="student",
        cascade="all, delete-orphan",
    )

    attendance_logs: Mapped[list["AttendanceLog"]] = relationship(
        "AttendanceLog",
        back_populates="student",
        cascade="all, delete-orphan",
    )

    behavioral_profile: Mapped["BehavioralProfile | None"] = relationship(
        "BehavioralProfile",
        back_populates="student",
        uselist=False,
        cascade="all, delete-orphan",
    )
