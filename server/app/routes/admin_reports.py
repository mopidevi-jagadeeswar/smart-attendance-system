from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.attendance import (
    AttendanceLog,
    AttendanceStatus,
)
from app.database.models.faculty import Faculty
from app.database.models.student import Student
from app.database.models.user import User, UserRole
from app.database.session import get_db
from app.dependencies.auth import require_role

# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/admin/reports",
    tags=["Admin Reports"],
)


# ============================================================
# HELPERS
# ============================================================


def parse_date(value: str | None, field_name: str) -> date | None:
    """
    Convert a YYYY-MM-DD string into a date object.
    """

    if not value:
        return None

    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must use YYYY-MM-DD format.",
        ) from exc


# ============================================================
# REPORTS
# ============================================================


@router.get("")
async def get_admin_reports(
    current_user: Annotated[
        User,
        Depends(require_role(UserRole.ADMIN)),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    start_date: str | None = Query(
        default=None,
        description="Start date in YYYY-MM-DD format.",
    ),
    end_date: str | None = Query(
        default=None,
        description="End date in YYYY-MM-DD format.",
    ),
    role: str = Query(
        default="all",
        description="all, student, or faculty.",
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="all, present, late, or absent.",
    ),
) -> dict:
    """
    Return attendance reports for the admin dashboard.

    Supports filtering by:

    - Start date
    - End date
    - Role
    - Attendance status

    Returns:

    - Attendance summary
    - Registered student count
    - Registered faculty count
    - Attendance records
    """

    # ========================================================
    # VALIDATE DATES
    # ========================================================

    parsed_start_date = parse_date(
        start_date,
        "start_date",
    )

    parsed_end_date = parse_date(
        end_date,
        "end_date",
    )

    if (
        parsed_start_date is not None
        and parsed_end_date is not None
        and parsed_start_date > parsed_end_date
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date cannot be later than end_date.",
        )

    # ========================================================
    # VALIDATE ROLE
    # ========================================================

    normalized_role = role.lower().strip()

    if normalized_role not in {
        "all",
        "student",
        "faculty",
    }:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="role must be all, student, or faculty.",
        )

    # ========================================================
    # VALIDATE ATTENDANCE STATUS
    # ========================================================

    normalized_status = status_filter.lower().strip() if status_filter else "all"

    if normalized_status not in {
        "all",
        "present",
        "late",
        "absent",
    }:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=("status must be all, present, late, or absent."),
        )

    # ========================================================
    # REGISTERED PEOPLE COUNTS
    # ========================================================

    student_count_result = await db.execute(select(func.count(Student.id)))

    student_count = student_count_result.scalar_one() or 0

    faculty_count_result = await db.execute(select(func.count(Faculty.id)))

    faculty_count = faculty_count_result.scalar_one() or 0

    # ========================================================
    # BASE ATTENDANCE QUERY
    # ========================================================

    query = (
        select(AttendanceLog)
        .outerjoin(
            Student,
            AttendanceLog.student_id == Student.id,
        )
        .outerjoin(
            Faculty,
            AttendanceLog.faculty_id == Faculty.id,
        )
    )

    # ========================================================
    # DATE FILTER
    # ========================================================

    if parsed_start_date is not None:
        query = query.where(AttendanceLog.attendance_date >= parsed_start_date)

    if parsed_end_date is not None:
        query = query.where(AttendanceLog.attendance_date <= parsed_end_date)

    # ========================================================
    # ROLE FILTER
    # ========================================================

    if normalized_role == "student":
        query = query.where(AttendanceLog.student_id.is_not(None))

    elif normalized_role == "faculty":
        query = query.where(AttendanceLog.faculty_id.is_not(None))

    # ========================================================
    # STATUS FILTER
    # ========================================================

    if normalized_status != "all":
        query = query.where(AttendanceLog.status == AttendanceStatus(normalized_status))

    # ========================================================
    # ORDER
    # ========================================================

    query = query.order_by(
        AttendanceLog.attendance_date.desc(),
        AttendanceLog.check_in_time.desc(),
    )

    # ========================================================
    # EXECUTE
    # ========================================================

    result = await db.execute(query)

    attendance_records = result.scalars().all()

    # ========================================================
    # SUMMARY COUNTS
    # ========================================================

    total_records = len(attendance_records)

    present_count = sum(
        1 for record in attendance_records if record.status == AttendanceStatus.PRESENT
    )

    late_count = sum(
        1 for record in attendance_records if record.status == AttendanceStatus.LATE
    )

    absent_count = sum(
        1 for record in attendance_records if record.status == AttendanceStatus.ABSENT
    )

    # ========================================================
    # ATTENDANCE RATE
    # ========================================================

    if total_records > 0:
        attendance_rate = ((present_count + late_count) / total_records) * 100
    else:
        attendance_rate = 0.0

    # ========================================================
    # BUILD RECORDS
    # ========================================================

    records: list[dict] = []

    for attendance in attendance_records:
        person_name = "Unknown"
        person_id = "—"
        person_role = "student"

        # ----------------------------------------------------
        # STUDENT
        # ----------------------------------------------------

        if attendance.student_id is not None:
            student_result = await db.execute(
                select(Student).where(Student.id == attendance.student_id)
            )

            student = student_result.scalar_one_or_none()

            if student is not None:
                person_name = student.full_name
                person_id = student.student_id
                person_role = "student"

        # ----------------------------------------------------
        # FACULTY
        # ----------------------------------------------------

        elif attendance.faculty_id is not None:
            faculty_result = await db.execute(
                select(Faculty).where(Faculty.id == attendance.faculty_id)
            )

            faculty = faculty_result.scalar_one_or_none()

            if faculty is not None:
                person_name = faculty.full_name
                person_id = faculty.faculty_id
                person_role = "faculty"

        # ----------------------------------------------------
        # TIME
        # ----------------------------------------------------

        check_in_time = None

        if attendance.check_in_time is not None:
            check_in_time = attendance.check_in_time.strftime("%H:%M:%S")

        # ----------------------------------------------------
        # RECORD
        # ----------------------------------------------------

        records.append(
            {
                "id": str(attendance.id),
                "name": person_name,
                "person_id": person_id,
                "role": person_role,
                "date": attendance.attendance_date.isoformat(),
                "time": check_in_time,
                "method": attendance.method.value,
                "status": attendance.status.value,
            }
        )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "summary": {
            "total_records": total_records,
            "present": present_count,
            "late": late_count,
            "absent": absent_count,
            "attendance_rate": round(
                attendance_rate,
                2,
            ),
            "students": student_count,
            "faculty": faculty_count,
        },
        "records": records,
    }
