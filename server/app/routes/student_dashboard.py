from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.attendance import (
    AttendanceLog,
    AttendanceStatus,
)
from app.database.models.student import Student
from app.database.models.user import User, UserRole
from app.database.session import get_db
from app.dependencies.auth import require_role


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/student/dashboard",
    tags=["Student Dashboard"],
)


# ============================================================
# DASHBOARD
# ============================================================


@router.get("")
async def get_student_dashboard(
    current_user: Annotated[
        User,
        Depends(require_role(UserRole.STUDENT)),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict:
    """
    Return the authenticated student's complete dashboard data.

    Data comes directly from PostgreSQL:
    - Student profile
    - Profile photo
    - Academic information
    - Attendance statistics
    - Today's attendance
    - Recent attendance records
    """

    # ========================================================
    # FIND STUDENT
    # ========================================================

    student_result = await db.execute(
        select(Student).where(
            Student.user_id == current_user.id,
        )
    )

    student = student_result.scalar_one_or_none()

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found.",
        )

    # ========================================================
    # ATTENDANCE TOTALS
    # ========================================================

    total_result = await db.execute(
        select(
            func.count(AttendanceLog.id),
        ).where(
            AttendanceLog.student_id == student.id,
        )
    )

    total_records = total_result.scalar_one() or 0

    # ========================================================
    # PRESENT COUNT
    # ========================================================

    present_result = await db.execute(
        select(
            func.count(AttendanceLog.id),
        ).where(
            AttendanceLog.student_id == student.id,
            AttendanceLog.status == AttendanceStatus.PRESENT,
        )
    )

    present_count = present_result.scalar_one() or 0

    # ========================================================
    # LATE COUNT
    # ========================================================

    late_result = await db.execute(
        select(
            func.count(AttendanceLog.id),
        ).where(
            AttendanceLog.student_id == student.id,
            AttendanceLog.status == AttendanceStatus.LATE,
        )
    )

    late_count = late_result.scalar_one() or 0

    # ========================================================
    # ABSENT COUNT
    # ========================================================

    absent_result = await db.execute(
        select(
            func.count(AttendanceLog.id),
        ).where(
            AttendanceLog.student_id == student.id,
            AttendanceLog.status == AttendanceStatus.ABSENT,
        )
    )

    absent_count = absent_result.scalar_one() or 0

    # ========================================================
    # ATTENDANCE RATE
    # ========================================================

    if total_records > 0:
        attendance_rate = ((present_count + late_count) / total_records) * 100
    else:
        attendance_rate = 0.0

    # ========================================================
    # TODAY'S ATTENDANCE
    # ========================================================

    today = date.today()

    today_result = await db.execute(
        select(AttendanceLog)
        .where(
            AttendanceLog.student_id == student.id,
            AttendanceLog.attendance_date == today,
        )
        .order_by(
            AttendanceLog.check_in_time.desc(),
        )
    )

    today_record = today_result.scalars().first()

    today_data: dict | None = None

    if today_record is not None:
        today_data = {
            "id": str(today_record.id),
            "date": today_record.attendance_date.isoformat(),
            "status": today_record.status.value,
            "method": today_record.method.value,
            "check_in": (
                today_record.check_in_time.isoformat()
                if today_record.check_in_time
                else None
            ),
            "check_out": (
                today_record.check_out_time.isoformat()
                if today_record.check_out_time
                else None
            ),
            "confidence": today_record.confidence_score,
            "device_id": today_record.device_id,
        }

    # ========================================================
    # RECENT ATTENDANCE
    # ========================================================

    recent_result = await db.execute(
        select(AttendanceLog)
        .where(
            AttendanceLog.student_id == student.id,
        )
        .order_by(
            AttendanceLog.attendance_date.desc(),
            AttendanceLog.check_in_time.desc(),
        )
        .limit(10)
    )

    recent_records = recent_result.scalars().all()

    recent_attendance = [
        {
            "id": str(record.id),
            "date": record.attendance_date.isoformat(),
            "status": record.status.value,
            "method": record.method.value,
            "check_in": (
                record.check_in_time.isoformat() if record.check_in_time else None
            ),
            "check_out": (
                record.check_out_time.isoformat() if record.check_out_time else None
            ),
            "confidence": record.confidence_score,
        }
        for record in recent_records
    ]

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "student": {
            "id": str(student.id),
            "student_id": student.student_id,
            "login_id": current_user.login_id,
            "full_name": student.full_name,
            "email": current_user.email,
            "phone": student.phone,
            "photo_url": student.photo_url,
            "department": student.department,
            "course": student.course,
            "year": student.year,
            "semester": student.semester,
            "section": student.section,
            "is_active": student.is_active,
            "is_verified": current_user.is_verified,
        },
        "attendance": {
            "total_records": total_records,
            "present": present_count,
            "late": late_count,
            "absent": absent_count,
            "attendance_rate": round(
                attendance_rate,
                2,
            ),
        },
        "today": today_data,
        "recent_attendance": recent_attendance,
    }
