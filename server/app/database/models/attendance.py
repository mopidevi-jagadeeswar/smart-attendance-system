from datetime import date, datetime
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from app.database.base import Base
from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    String,
    func,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.database.models.faculty import Faculty
    from app.database.models.student import Student


class AttendanceMethod(str, Enum):
    """Methods through which attendance can be recorded."""

    FACE = "face"
    NFC = "nfc"
    MANUAL = "manual"


class AttendanceStatus(str, Enum):
    """Possible attendance statuses."""

    PRESENT = "present"
    LATE = "late"
    ABSENT = "absent"


class AttendanceLog(Base):
    """
    Database model for student and faculty attendance records.

    Each record belongs to exactly one person:
    - Student, OR
    - Faculty

    Admin users are not allowed to have attendance records.
    """

    __tablename__ = "attendance_logs"

    __table_args__ = (
        CheckConstraint(
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
            name="attendance_one_person_type",
        ),
    )

    # ============================================================
    # PRIMARY KEY
    # ============================================================

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    # ============================================================
    # STUDENT RELATIONSHIP
    # ============================================================

    student_id: Mapped[UUID | None] = mapped_column(
        ForeignKey(
            "students.id",
            ondelete="CASCADE",
        ),
        nullable=True,
        index=True,
    )

    student: Mapped["Student | None"] = relationship(
        "Student",
        back_populates="attendance_logs",
    )

    # ============================================================
    # FACULTY RELATIONSHIP
    # ============================================================

    faculty_id: Mapped[UUID | None] = mapped_column(
        ForeignKey(
            "faculty.id",
            ondelete="CASCADE",
        ),
        nullable=True,
        index=True,
    )

    faculty: Mapped["Faculty | None"] = relationship(
        "Faculty",
        back_populates="attendance_logs",
    )

    # ============================================================
    # ATTENDANCE INFORMATION
    # ============================================================

    attendance_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    check_in_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    check_out_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    method: Mapped[AttendanceMethod] = mapped_column(
        SQLEnum(
            AttendanceMethod,
            name="attendance_method",
        ),
        nullable=False,
    )

    status: Mapped[AttendanceStatus] = mapped_column(
        SQLEnum(
            AttendanceStatus,
            name="attendance_status",
        ),
        nullable=False,
    )

    # ============================================================
    # VERIFICATION INFORMATION
    # ============================================================

    confidence_score: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    device_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    # ============================================================
    # AUDIT INFORMATION
    # ============================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
