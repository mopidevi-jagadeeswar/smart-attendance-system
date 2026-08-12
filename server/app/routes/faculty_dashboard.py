from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models.attendance import (
    AttendanceLog,
    AttendanceStatus,
)
from app.database.models.student import Student
from app.database.models.user import User
from app.database.session import get_db
from app.dependencies.auth import get_current_user


router = APIRouter(
    prefix="/api/v1/faculty",
    tags=["Faculty Dashboard"],
)


# ============================================================
# FACULTY DASHBOARD
# ============================================================


@router.get("/dashboard")
async def get_faculty_dashboard(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Return live faculty dashboard information.

    All attendance statistics are calculated directly
    from the attendance_logs database table.
    """

    # ========================================================
    # VERIFY ROLE
    # ========================================================

    if current_user.role.value != "faculty":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty members can access the faculty dashboard.",
        )

    # ========================================================
    # FACULTY PROFILE
    # ========================================================

    faculty = current_user.faculty

    if faculty is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile was not found.",
        )

    # ========================================================
    # USE THE SAME DATE LOGIC AS ATTENDANCE CREATION
    # ========================================================

    now = datetime.now(UTC)
    today = now.date()

    # ========================================================
    # GET ACTIVE STUDENTS
    # ========================================================

    student_query = select(Student).where(
        Student.is_active.is_(True),
    )

    # Keep faculty department filtering.
    if faculty.department:
        student_query = student_query.where(
            Student.department == faculty.department,
        )

    student_query = student_query.order_by(
        Student.full_name.asc(),
    )

    student_result = await db.execute(student_query)

    students = list(
        student_result.scalars().all(),
    )

    total_students = len(students)

    student_ids = {student.id for student in students}

    # ========================================================
    # GET TODAY'S ATTENDANCE
    # ========================================================

    attendance_records: list[AttendanceLog] = []

    if student_ids:
        attendance_query = (
            select(AttendanceLog)
            .options(
                selectinload(
                    AttendanceLog.student,
                ),
            )
            .where(
                AttendanceLog.attendance_date == today,
                AttendanceLog.student_id.in_(student_ids),
            )
            .order_by(
                AttendanceLog.check_in_time.desc(),
            )
        )

        attendance_result = await db.execute(
            attendance_query,
        )

        attendance_records = list(
            attendance_result.scalars().all(),
        )

    # ========================================================
    # LATEST ATTENDANCE PER STUDENT
    # ========================================================

    latest_by_student: dict = {}

    for record in attendance_records:
        if record.student_id is None:
            continue

        if record.student_id not in latest_by_student:
            latest_by_student[record.student_id] = record

    # ========================================================
    # COUNT STATUS
    # ========================================================

    present_count = 0
    late_count = 0

    for record in latest_by_student.values():
        if record.status == AttendanceStatus.PRESENT:
            present_count += 1

        elif record.status == AttendanceStatus.LATE:
            late_count += 1

    # ========================================================
    # ABSENT
    # ========================================================

    marked_count = len(
        latest_by_student,
    )

    absent_count = max(
        total_students - marked_count,
        0,
    )

    # ========================================================
    # ATTENDANCE RATE
    # ========================================================

    attended_count = present_count + late_count

    if total_students > 0:
        attendance_rate = round(
            (attended_count / total_students) * 100,
            1,
        )
    else:
        attendance_rate = 0.0

    # ========================================================
    # RECENT ATTENDANCE
    # ========================================================

    recent_attendance: list[dict] = []

    for record in attendance_records[:20]:
        student = record.student

        if student is None:
            continue

        method_value = (
            record.method.value
            if hasattr(
                record.method,
                "value",
            )
            else str(record.method)
        )

        status_value = (
            record.status.value
            if hasattr(
                record.status,
                "value",
            )
            else str(record.status)
        )

        recent_attendance.append(
            {
                "id": str(record.id),
                "student_id": student.student_id,
                "studentId": student.student_id,
                "student_name": student.full_name,
                "studentName": student.full_name,
                "name": student.full_name,
                "date": (
                    record.attendance_date.isoformat()
                    if record.attendance_date
                    else None
                ),
                "time": (
                    record.check_in_time.isoformat() if record.check_in_time else None
                ),
                "check_in_time": (
                    record.check_in_time.isoformat() if record.check_in_time else None
                ),
                "method": method_value,
                "status": status_value,
            }
        )

    # ========================================================
    # ABSENT STUDENTS
    # ========================================================

    absent_students: list[dict] = []

    for student in students:
        if student.id in latest_by_student:
            continue

        absent_students.append(
            {
                "id": str(student.id),
                "student_id": student.student_id,
                "studentId": student.student_id,
                "name": student.full_name,
                "department": student.department,
                "date": today.isoformat(),
                "status": "absent",
            }
        )

    # ========================================================
    # FACULTY INFORMATION
    # ========================================================

    faculty_data = {
        "id": str(faculty.id),
        "faculty_id": faculty.faculty_id,
        "facultyId": faculty.faculty_id,
        "name": faculty.full_name,
        "full_name": faculty.full_name,
        "email": current_user.email,
        "department": faculty.department,
        "designation": getattr(
            faculty,
            "designation",
            None,
        ),
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
    }

    # ========================================================
    # ATTENDANCE OVERVIEW
    # ========================================================

    today_data = {
        "date": today.isoformat(),
        "total_students": total_students,
        "totalStudents": total_students,
        "total_marked": marked_count,
        "totalMarked": marked_count,
        "present": present_count,
        "late": late_count,
        "absent": absent_count,
        "attendance_rate": attendance_rate,
        "attendanceRate": attendance_rate,
    }

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "success": True,
        "faculty": faculty_data,
        "today": today_data,
        "attendance_overview": today_data,
        "recent_attendance": recent_attendance,
        "absent_students": absent_students,
        # Useful for debugging while we connect the frontend.
        "debug": {
            "server_utc_time": now.isoformat(),
            "attendance_date_used": today.isoformat(),
            "faculty_department": faculty.department,
            "students_found": total_students,
            "attendance_records_found": len(
                attendance_records,
            ),
            "students_with_attendance": marked_count,
        },
    }
