from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.attendance import (
    AttendanceLog,
    AttendanceStatus,
)
from app.database.models.behavioral_profile import BehavioralProfile


# ============================================================
# TYPE DEFINITIONS
# ============================================================

PersonType = str


# ============================================================
# ATTENDANCE STATISTICS
# ============================================================


def calculate_attendance_statistics(
    attendance_logs: Sequence[AttendanceLog],
) -> tuple[int, int, int]:
    """
    Calculate basic attendance statistics.

    Returns:
        total_present:
            Number of PRESENT attendance records.

        total_absent:
            Number of ABSENT attendance records.

        total_late:
            Number of LATE attendance records.
    """

    total_present = 0
    total_absent = 0
    total_late = 0

    for log in attendance_logs:
        if log.status == AttendanceStatus.PRESENT:
            total_present += 1

        elif log.status == AttendanceStatus.ABSENT:
            total_absent += 1

        elif log.status == AttendanceStatus.LATE:
            total_late += 1

    return (
        total_present,
        total_absent,
        total_late,
    )


# ============================================================
# ATTENDANCE RATE
# ============================================================


def calculate_attendance_rate(
    total_present: int,
    total_absent: int,
    total_late: int,
) -> float:
    """
    Calculate overall attendance rate.

    PRESENT and LATE both count as attendance.

    Formula:

        (present + late)
        ---------------- × 100
        present + late + absent

    Returns:
        Percentage from 0.0 to 100.0.
    """

    total_records = total_present + total_absent + total_late

    if total_records == 0:
        return 0.0

    attended = total_present + total_late

    return round(
        (attended / total_records) * 100,
        2,
    )


# ============================================================
# PUNCTUALITY SCORE
# ============================================================


def calculate_punctuality_score(
    total_present: int,
    total_late: int,
) -> float:
    """
    Calculate punctuality score.

    PRESENT is considered punctual.
    LATE is considered non-punctual.

    Formula:

        present
        -------------- × 100
        present + late

    Returns:
        Percentage from 0.0 to 100.0.
    """

    attended_records = total_present + total_late

    if attended_records == 0:
        return 0.0

    return round(
        (total_present / attended_records) * 100,
        2,
    )


# ============================================================
# CONSISTENCY SCORE
# ============================================================


def calculate_consistency_score(
    attendance_logs: Sequence[AttendanceLog],
) -> float:
    """
    Calculate attendance consistency.

    The attendance history is divided into weekly periods.

    For each week:

        weekly attendance =
        attended days / total recorded days

    The consistency score is based on how stable those
    weekly attendance percentages are.

    A student/faculty member whose attendance remains
    stable across weeks receives a higher score.

    Returns:
        Percentage from 0.0 to 100.0.
    """

    if not attendance_logs:
        return 0.0

    weekly_records: dict[
        date,
        list[bool],
    ] = defaultdict(list)

    for log in attendance_logs:
        attendance_date = log.attendance_date

        # Monday is the beginning of the week.
        week_start = attendance_date - timedelta(days=attendance_date.weekday())

        attended = log.status in (
            AttendanceStatus.PRESENT,
            AttendanceStatus.LATE,
        )

        weekly_records[week_start].append(attended)

    # Need at least two weeks to measure consistency.
    if len(weekly_records) < 2:
        return 100.0

    weekly_rates: list[float] = []

    for records in weekly_records.values():
        if not records:
            continue

        attended_count = sum(records)

        weekly_rate = (attended_count / len(records)) * 100

        weekly_rates.append(weekly_rate)

    if len(weekly_rates) < 2:
        return 100.0

    mean_rate = sum(weekly_rates) / len(weekly_rates)

    variance = sum((rate - mean_rate) ** 2 for rate in weekly_rates) / len(weekly_rates)

    standard_deviation = variance**0.5

    # Convert variation into a consistency score.
    #
    # 0 deviation   -> 100 consistency
    # 50 deviation  ->   0 consistency
    #
    # Values below zero are clamped to zero.

    score = max(
        0.0,
        100.0 - (standard_deviation * 2),
    )

    return round(
        min(score, 100.0),
        2,
    )


# ============================================================
# RISK SCORE
# ============================================================


def calculate_risk_score(
    attendance_rate: float,
    punctuality_score: float,
    consistency_score: float,
) -> float:
    """
    Calculate behavioral risk score.

    Higher score means higher attendance-related risk.

    Weighting:

        Attendance      -> 50%
        Punctuality     -> 25%
        Consistency     -> 25%

    The individual scores represent positive behavior,
    therefore they are inverted when calculating risk.

    Formula:

        risk =
            (100 - attendance_rate) * 0.50
            +
            (100 - punctuality_score) * 0.25
            +
            (100 - consistency_score) * 0.25

    Returns:
        Risk percentage from 0.0 to 100.0.
    """

    risk_score = (
        (100.0 - attendance_rate) * 0.50
        + (100.0 - punctuality_score) * 0.25
        + (100.0 - consistency_score) * 0.25
    )

    return round(
        max(0.0, min(risk_score, 100.0)),
        2,
    )


# ============================================================
# GET ATTENDANCE LOGS
# ============================================================


async def get_person_attendance_logs(
    db: AsyncSession,
    person_id: UUID,
    person_type: PersonType,
) -> list[AttendanceLog]:
    """
    Retrieve attendance records for a student or faculty member.

    Args:
        db:
            Async SQLAlchemy session.

        person_id:
            UUID of the student or faculty member.

        person_type:
            Either "student" or "faculty".

    Returns:
        List of AttendanceLog records.
    """

    if person_type not in {
        "student",
        "faculty",
    }:
        raise ValueError("person_type must be 'student' or 'faculty'")

    if person_type == "student":
        statement = (
            select(AttendanceLog)
            .where(AttendanceLog.student_id == person_id)
            .order_by(AttendanceLog.attendance_date.asc())
        )

    else:
        statement = (
            select(AttendanceLog)
            .where(AttendanceLog.faculty_id == person_id)
            .order_by(AttendanceLog.attendance_date.asc())
        )

    result = await db.execute(statement)

    return list(result.scalars().all())


# ============================================================
# GET EXISTING BEHAVIORAL PROFILE
# ============================================================


async def get_behavioral_profile(
    db: AsyncSession,
    person_id: UUID,
    person_type: PersonType,
) -> BehavioralProfile | None:
    """
    Retrieve an existing behavioral profile.
    """

    if person_type == "student":
        statement = select(BehavioralProfile).where(
            BehavioralProfile.student_id == person_id
        )

    elif person_type == "faculty":
        statement = select(BehavioralProfile).where(
            BehavioralProfile.faculty_id == person_id
        )

    else:
        raise ValueError("person_type must be 'student' or 'faculty'")

    result = await db.execute(statement)

    return result.scalar_one_or_none()


# ============================================================
# CALCULATE BEHAVIORAL PROFILE
# ============================================================


async def calculate_behavioral_profile(
    db: AsyncSession,
    person_id: UUID,
    person_type: PersonType,
) -> BehavioralProfile:
    """
    Calculate and persist the behavioral profile for
    either a student or faculty member.

    This function:

        1. Fetches attendance logs.
        2. Calculates attendance statistics.
        3. Calculates attendance rate.
        4. Calculates punctuality score.
        5. Calculates consistency score.
        6. Calculates risk score.
        7. Creates or updates BehavioralProfile.
    """

    if person_type not in {
        "student",
        "faculty",
    }:
        raise ValueError("person_type must be 'student' or 'faculty'")

    # ------------------------------------------------------------
    # GET ATTENDANCE HISTORY
    # ------------------------------------------------------------

    attendance_logs = await get_person_attendance_logs(
        db=db,
        person_id=person_id,
        person_type=person_type,
    )

    # ------------------------------------------------------------
    # CALCULATE BASIC STATISTICS
    # ------------------------------------------------------------

    (
        total_present,
        total_absent,
        total_late,
    ) = calculate_attendance_statistics(attendance_logs)

    # ------------------------------------------------------------
    # CALCULATE ATTENDANCE RATE
    # ------------------------------------------------------------

    attendance_rate = calculate_attendance_rate(
        total_present=total_present,
        total_absent=total_absent,
        total_late=total_late,
    )

    # ------------------------------------------------------------
    # CALCULATE PUNCTUALITY
    # ------------------------------------------------------------

    punctuality_score = calculate_punctuality_score(
        total_present=total_present,
        total_late=total_late,
    )

    # ------------------------------------------------------------
    # CALCULATE CONSISTENCY
    # ------------------------------------------------------------

    consistency_score = calculate_consistency_score(
        attendance_logs=attendance_logs,
    )

    # ------------------------------------------------------------
    # CALCULATE RISK
    # ------------------------------------------------------------

    risk_score = calculate_risk_score(
        attendance_rate=attendance_rate,
        punctuality_score=punctuality_score,
        consistency_score=consistency_score,
    )

    # ------------------------------------------------------------
    # FIND EXISTING PROFILE
    # ------------------------------------------------------------

    profile = await get_behavioral_profile(
        db=db,
        person_id=person_id,
        person_type=person_type,
    )

    # ------------------------------------------------------------
    # CURRENT TIME
    # ------------------------------------------------------------

    calculated_at = datetime.now(timezone.utc)

    # ------------------------------------------------------------
    # CREATE PROFILE
    # ------------------------------------------------------------

    if profile is None:
        if person_type == "student":
            profile = BehavioralProfile(
                student_id=person_id,
                faculty_id=None,
            )
        else:
            profile = BehavioralProfile(
                student_id=None,
                faculty_id=person_id,
            )

        db.add(profile)

    # ------------------------------------------------------------
    # UPDATE PROFILE
    # ------------------------------------------------------------

    profile.total_present = total_present
    profile.total_absent = total_absent
    profile.total_late = total_late

    profile.attendance_rate = attendance_rate
    profile.punctuality_score = punctuality_score
    profile.consistency_score = consistency_score
    profile.risk_score = risk_score

    profile.last_calculated_at = calculated_at

    await db.commit()

    await db.refresh(profile)

    return profile


# ============================================================
# CALCULATE ALL PROFILES
# ============================================================


async def calculate_all_behavioral_profiles(
    db: AsyncSession,
) -> None:
    """
    Recalculate behavioral profiles for all students
    and faculty members who have attendance records.

    This function is useful for:

        - scheduled background jobs
        - daily analytics
        - admin dashboard refresh
        - batch model updates
    """

    # ------------------------------------------------------------
    # FIND STUDENTS WITH ATTENDANCE
    # ------------------------------------------------------------

    student_statement = (
        select(AttendanceLog.student_id)
        .where(AttendanceLog.student_id.is_not(None))
        .distinct()
    )

    student_result = await db.execute(student_statement)

    student_ids = [row[0] for row in student_result.all() if row[0] is not None]

    # ------------------------------------------------------------
    # CALCULATE STUDENT PROFILES
    # ------------------------------------------------------------

    for student_id in student_ids:
        await calculate_behavioral_profile(
            db=db,
            person_id=student_id,
            person_type="student",
        )

    # ------------------------------------------------------------
    # FIND FACULTY WITH ATTENDANCE
    # ------------------------------------------------------------

    faculty_statement = (
        select(AttendanceLog.faculty_id)
        .where(AttendanceLog.faculty_id.is_not(None))
        .distinct()
    )

    faculty_result = await db.execute(faculty_statement)

    faculty_ids = [row[0] for row in faculty_result.all() if row[0] is not None]

    # ------------------------------------------------------------
    # CALCULATE FACULTY PROFILES
    # ------------------------------------------------------------

    for faculty_id in faculty_ids:
        await calculate_behavioral_profile(
            db=db,
            person_id=faculty_id,
            person_type="faculty",
        )
