from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from app.database.base import Base
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.database.models.faculty import Faculty
    from app.database.models.student import Student


class BehavioralProfile(Base):
    """
    Derived behavioral analytics profile for a student or faculty member.

    Behavioral metrics are calculated from attendance logs.
    Each profile belongs to exactly one person:
    - Student, OR
    - Faculty
    """

    __tablename__ = "behavioral_profiles"

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
            name="behavioral_profile_one_person_type",
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
        unique=True,
        index=True,
    )

    student: Mapped["Student | None"] = relationship(
        "Student",
        back_populates="behavioral_profile",
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
        unique=True,
        index=True,
    )

    faculty: Mapped["Faculty | None"] = relationship(
        "Faculty",
        back_populates="behavioral_profile",
    )

    # ============================================================
    # ATTENDANCE STATISTICS
    # ============================================================

    total_present: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    total_absent: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    total_late: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # ============================================================
    # BEHAVIORAL SCORES
    # ============================================================

    attendance_rate: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    punctuality_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    consistency_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    risk_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    # ============================================================
    # ANALYTICS INFORMATION
    # ============================================================

    last_calculated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
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

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
