from __future__ import annotations

from datetime import date
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

    Attendance statistics are calculated directly from
    the students and attendance_logs tables.

    Only authenticated faculty members can access this endpoint.
    """

    # ========================================================
    # VERIFY ROLE
    # ========================================================

    if current_user.role.value != "faculty":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=("Only faculty members can access the faculty dashboard."),
        )

    # ========================================================
    # VERIFY FACULTY PROFILE
    # ========================================================

    faculty = current_user.faculty

    if faculty is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty profile was not found.",
        )

    # ========================================================
    # TODAY
    # ========================================================

    today = date.today()

    # ========================================================
    # GET ACTIVE STUDENTS
    #
    # If the faculty has a department, use students from
    # that department.
    #
    # If department is empty/null, use all active students.
    # ========================================================

    student_stmt = select(Student).where(
        Student.is_active.is_(True),
    )

    if faculty.department:
        student_stmt = student_stmt.where(
            Student.department == faculty.department,
        )

    student_stmt = student_stmt.order_by(
        Student.full_name.asc(),
    )

    student_result = await db.execute(
        student_stmt,
    )

    students = list(
        student_result.scalars().all(),
    )

    total_students = len(students)

    student_ids = {student.id for student in students}

    # ========================================================
    # GET TODAY'S REAL ATTENDANCE RECORDS
    # ========================================================

    attendance_records: list[AttendanceLog] = []

    if student_ids:
        attendance_stmt = (
            select(AttendanceLog)
            .options(
                selectinload(
                    AttendanceLog.student,
                ),
            )
            .where(
                AttendanceLog.attendance_date == today,
                AttendanceLog.student_id.in_(
                    student_ids,
                ),
            )
            .order_by(
                AttendanceLog.check_in_time.desc(),
            )
        )

        attendance_result = await db.execute(
            attendance_stmt,
        )

        attendance_records = list(
            attendance_result.scalars().all(),
        )

    # ========================================================
    # ONE ATTENDANCE RECORD PER STUDENT
    #
    # If the same student has multiple records today,
    # use their latest record.
    # ========================================================

    latest_by_student: dict = {}

    for record in attendance_records:
        if record.student_id is None:
            continue

        if record.student_id not in latest_by_student:
            latest_by_student[record.student_id] = record

    # ========================================================
    # CALCULATE REAL COUNTS
    # ========================================================

    present_count = sum(
        1
        for record in latest_by_student.values()
        if record.status == AttendanceStatus.PRESENT
    )

    late_count = sum(
        1
        for record in latest_by_student.values()
        if record.status == AttendanceStatus.LATE
    )

    absent_count = max(
        total_students - len(latest_by_student),
        0,
    )

    total_marked = len(
        latest_by_student,
    )

    # ========================================================
    # ATTENDANCE RATE
    # ========================================================

    if total_students > 0:
        attendance_rate = round(
            ((present_count + late_count) / total_students) * 100,
            1,
        )
    else:
        attendance_rate = 0.0

    # ========================================================
    # RECENT ATTENDANCE
    # ========================================================

    recent_attendance = []

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

    absent_students = []

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
    # TODAY ATTENDANCE DATA
    # ========================================================

    today_data = {
        "date": today.isoformat(),
        "total_students": total_students,
        "totalStudents": total_students,
        "total_marked": total_marked,
        "totalMarked": total_marked,
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
    }
