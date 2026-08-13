from datetime import date, datetime, timedelta, timezone
from typing import Annotated

from argon2 import PasswordHasher
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
    prefix="/admin",
    tags=["Admin"],
)


password_hasher = PasswordHasher()


# ============================================================
# REQUEST SCHEMAS
# ============================================================


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserRoleUpdate(BaseModel):
    role: UserRole


class PasswordResetRequest(BaseModel):
    new_password: str


# ============================================================
# ADMIN DASHBOARD
# ============================================================


@router.get("/dashboard/summary")
async def get_dashboard_summary(
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict:
    """
    Return dashboard statistics for the authenticated administrator.

    Includes:

    - Total students
    - Total faculty
    - Total administrators
    - Today's attendance statistics
    - Attendance percentage
    - Seven-day attendance trend
    - Recent attendance activity
    """

    # ========================================================
    # DATE INFORMATION
    # ========================================================

    today = date.today()

    seven_days_ago = today - timedelta(days=6)

    # ========================================================
    # TOTAL STUDENTS
    # ========================================================

    student_result = await db.execute(
        select(
            func.count(Student.id),
        ),
    )

    total_students = int(
        student_result.scalar_one() or 0,
    )

    # ========================================================
    # TOTAL FACULTY
    # ========================================================

    faculty_result = await db.execute(
        select(
            func.count(Faculty.id),
        ),
    )

    total_faculty = int(
        faculty_result.scalar_one() or 0,
    )

    # ========================================================
    # TOTAL ADMINISTRATORS
    # ========================================================

    admin_result = await db.execute(
        select(
            func.count(User.id),
        ).where(
            User.role == UserRole.ADMIN,
        ),
    )

    total_admins = int(
        admin_result.scalar_one() or 0,
    )

    # ========================================================
    # TODAY'S ATTENDANCE
    # ========================================================

    today_attendance_result = await db.execute(
        select(
            func.count(AttendanceLog.id).label("total"),
            func.sum(
                case(
                    (
                        AttendanceLog.status == AttendanceStatus.PRESENT,
                        1,
                    ),
                    else_=0,
                ),
            ).label("present"),
            func.sum(
                case(
                    (
                        AttendanceLog.status == AttendanceStatus.LATE,
                        1,
                    ),
                    else_=0,
                ),
            ).label("late"),
            func.sum(
                case(
                    (
                        AttendanceLog.status == AttendanceStatus.ABSENT,
                        1,
                    ),
                    else_=0,
                ),
            ).label("absent"),
        ).where(
            AttendanceLog.attendance_date == today,
        ),
    )

    attendance_row = today_attendance_result.one()

    today_total = int(
        attendance_row.total or 0,
    )

    today_present = int(
        attendance_row.present or 0,
    )

    today_late = int(
        attendance_row.late or 0,
    )

    today_absent = int(
        attendance_row.absent or 0,
    )

    # ========================================================
    # ATTENDANCE PERCENTAGE
    # ========================================================

    if today_total > 0:
        attendance_percentage = round(
            ((today_present + today_late) / today_total) * 100,
            2,
        )
    else:
        attendance_percentage = 0.0

    # ========================================================
    # SEVEN-DAY ATTENDANCE TREND
    # ========================================================

    trend_result = await db.execute(
        select(
            AttendanceLog.attendance_date,
            func.count(AttendanceLog.id).label(
                "total",
            ),
            func.sum(
                case(
                    (
                        AttendanceLog.status == AttendanceStatus.PRESENT,
                        1,
                    ),
                    else_=0,
                ),
            ).label("present"),
            func.sum(
                case(
                    (
                        AttendanceLog.status == AttendanceStatus.LATE,
                        1,
                    ),
                    else_=0,
                ),
            ).label("late"),
            func.sum(
                case(
                    (
                        AttendanceLog.status == AttendanceStatus.ABSENT,
                        1,
                    ),
                    else_=0,
                ),
            ).label("absent"),
        )
        .where(
            AttendanceLog.attendance_date >= seven_days_ago,
            AttendanceLog.attendance_date <= today,
        )
        .group_by(
            AttendanceLog.attendance_date,
        )
        .order_by(
            AttendanceLog.attendance_date.asc(),
        ),
    )

    trend_rows = trend_result.all()

    trend_map = {row.attendance_date: row for row in trend_rows}

    attendance_trend: list[dict] = []

    for offset in range(7):
        current_date = seven_days_ago + timedelta(days=offset)

        row = trend_map.get(current_date)

        total = int(
            row.total if row else 0,
        )

        present = int(
            row.present if row else 0,
        )

        late = int(
            row.late if row else 0,
        )

        absent = int(
            row.absent if row else 0,
        )

        if total > 0:
            percentage = round(
                ((present + late) / total) * 100,
                2,
            )
        else:
            percentage = 0.0

        attendance_trend.append(
            {
                "date": current_date.isoformat(),
                "day": current_date.strftime("%a"),
                "total": total,
                "present": present,
                "late": late,
                "absent": absent,
                "percentage": percentage,
            },
        )

    # ========================================================
    # RECENT ATTENDANCE ACTIVITY
    # ========================================================

    recent_result = await db.execute(
        select(AttendanceLog)
        .options(
            selectinload(
                AttendanceLog.student,
            ),
            selectinload(
                AttendanceLog.faculty,
            ),
        )
        .order_by(
            AttendanceLog.created_at.desc(),
        )
        .limit(10),
    )

    recent_logs = recent_result.scalars().all()

    recent_activity: list[dict] = []

    for log in recent_logs:
        person_name: str | None = None
        person_id: str | None = None
        person_role: str | None = None
        photo_url: str | None = None

        # ----------------------------------------------------
        # STUDENT
        # ----------------------------------------------------

        if log.student is not None:
            person_name = log.student.full_name
            person_id = str(log.student.id)
            person_role = "student"
            photo_url = log.student.photo_url

        # ----------------------------------------------------
        # FACULTY
        # ----------------------------------------------------

        elif log.faculty is not None:
            person_name = log.faculty.full_name
            person_id = str(log.faculty.id)
            person_role = "faculty"
            photo_url = log.faculty.photo_url

        # ----------------------------------------------------
        # ATTENDANCE RECORD
        # ----------------------------------------------------

        recent_activity.append(
            {
                "id": str(log.id),
                "person_id": person_id,
                "person_name": person_name,
                "role": person_role,
                "photo_url": photo_url,
                "status": log.status.value,
                "method": log.method.value,
                "attendance_date": (log.attendance_date.isoformat()),
                "check_in_time": (
                    log.check_in_time.isoformat() if log.check_in_time else None
                ),
                "check_out_time": (
                    log.check_out_time.isoformat() if log.check_out_time else None
                ),
                "confidence_score": (log.confidence_score),
            },
        )

    # ========================================================
    # CURRENT ADMIN
    # ========================================================

    admin_name = current_user.login_id

    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {
        "admin": {
            "id": str(current_user.id),
            "login_id": current_user.login_id,
            "email": current_user.email,
            "name": admin_name,
        },
        "summary": {
            "total_students": total_students,
            "total_faculty": total_faculty,
            "total_admins": total_admins,
            "today_total": today_total,
            "today_present": today_present,
            "today_late": today_late,
            "today_absent": today_absent,
            "attendance_percentage": attendance_percentage,
        },
        "attendance_trend": attendance_trend,
        "recent_activity": recent_activity,
    }


# ============================================================
# ADMIN AUTHENTICATION
# ============================================================


@router.get("/me")
async def get_my_profile(
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
) -> dict[str, str]:
    """
    Return the currently authenticated
    administrator's basic information.
    """

    return {
        "message": "Admin authentication successful",
        "login_id": current_user.login_id,
        "role": current_user.role.value,
    }


# ============================================================
# GET ALL USERS
# ============================================================


@router.get("/users")
async def get_users(
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> list[dict]:
    """
    Return all users with their role profile information.

    Student and faculty profile photos are included.

    Password hashes are never returned.
    """

    result = await db.execute(
        select(User)
        .options(
            selectinload(User.student),
            selectinload(User.faculty),
            selectinload(User.admin),
        )
        .order_by(
            User.created_at.desc(),
        ),
    )

    users = result.scalars().all()

    response: list[dict] = []

    for user in users:
        full_name: str | None = None
        photo_url: str | None = None

        # ====================================================
        # STUDENT
        # ====================================================

        if user.role == UserRole.STUDENT:
            student = user.student

            if student is not None:
                full_name = student.full_name
                photo_url = student.photo_url

        # ====================================================
        # FACULTY
        # ====================================================

        elif user.role == UserRole.FACULTY:
            faculty = user.faculty

            if faculty is not None:
                full_name = getattr(
                    faculty,
                    "full_name",
                    None,
                )

                photo_url = getattr(
                    faculty,
                    "photo_url",
                    None,
                )

                if full_name is None:
                    full_name = getattr(
                        faculty,
                        "name",
                        None,
                    )

        # ====================================================
        # ADMIN
        # ====================================================

        elif user.role == UserRole.ADMIN:
            full_name = user.login_id
            photo_url = None

        # ====================================================
        # FINAL RESPONSE
        # ====================================================

        response.append(
            {
                "id": str(user.id),
                "login_id": user.login_id,
                "email": user.email,
                "role": user.role.value,
                "full_name": full_name,
                "photo_url": photo_url,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "created_at": (
                    user.created_at.isoformat() if user.created_at else None
                ),
            },
        )

    return response


# ============================================================
# GET SINGLE USER
# ============================================================


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict:
    """
    Return a single user's information.
    """

    result = await db.execute(
        select(User)
        .options(
            selectinload(User.student),
            selectinload(User.faculty),
            selectinload(User.admin),
        )
        .where(
            User.id == user_id,
        ),
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    full_name: str | None = None
    photo_url: str | None = None

    # ========================================================
    # STUDENT
    # ========================================================

    if user.role == UserRole.STUDENT:
        student = user.student

        if student is not None:
            full_name = student.full_name
            photo_url = student.photo_url

    # ========================================================
    # FACULTY
    # ========================================================

    elif user.role == UserRole.FACULTY:
        faculty = user.faculty

        if faculty is not None:
            full_name = getattr(
                faculty,
                "full_name",
                None,
            )

            photo_url = getattr(
                faculty,
                "photo_url",
                None,
            )

            if full_name is None:
                full_name = getattr(
                    faculty,
                    "name",
                    None,
                )

    # ========================================================
    # ADMIN
    # ========================================================

    elif user.role == UserRole.ADMIN:
        full_name = user.login_id
        photo_url = None

    return {
        "id": str(user.id),
        "login_id": user.login_id,
        "email": user.email,
        "role": user.role.value,
        "full_name": full_name,
        "photo_url": photo_url,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": (user.created_at.isoformat() if user.created_at else None),
    }


# ============================================================
# ACTIVATE / DEACTIVATE USER
# ============================================================


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    data: UserStatusUpdate,
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict:
    """
    Activate or deactivate a user account.
    """

    result = await db.execute(
        select(User).where(
            User.id == user_id,
        ),
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # ========================================================
    # PREVENT SELF-DISABLE
    # ========================================================

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own account status",
        )

    user.is_active = data.is_active

    await db.commit()

    await db.refresh(user)

    return {
        "message": (
            "User activated successfully"
            if user.is_active
            else "User deactivated successfully"
        ),
        "user": {
            "id": str(user.id),
            "login_id": user.login_id,
            "is_active": user.is_active,
        },
    }


# ============================================================
# CHANGE USER ROLE
# ============================================================


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    data: UserRoleUpdate,
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict:
    """
    Change a user's role.
    """

    result = await db.execute(
        select(User).where(
            User.id == user_id,
        ),
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # ========================================================
    # PREVENT SELF ROLE CHANGE
    # ========================================================

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )

    user.role = data.role

    await db.commit()

    await db.refresh(user)

    return {
        "message": "User role updated successfully",
        "user": {
            "id": str(user.id),
            "login_id": user.login_id,
            "role": user.role.value,
        },
    }


# ============================================================
# RESET PASSWORD
# ============================================================


@router.post(
    "/users/{user_id}/reset-password",
)
async def reset_user_password(
    user_id: str,
    data: PasswordResetRequest,
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict[str, str]:
    """
    Reset a user's password.

    The password is hashed before being stored.
    """

    # ========================================================
    # VALIDATE PASSWORD
    # ========================================================

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 8 characters",
        )

    # ========================================================
    # FIND USER
    # ========================================================

    result = await db.execute(
        select(User).where(
            User.id == user_id,
        ),
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # ========================================================
    # HASH PASSWORD
    # ========================================================

    user.password_hash = password_hasher.hash(
        data.new_password,
    )

    await db.commit()

    return {
        "message": "User password reset successfully",
    }


# ============================================================
# DELETE USER
# ============================================================


@router.delete(
    "/users/{user_id}",
)
async def delete_user(
    user_id: str,
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict[str, str]:
    """
    Permanently delete a user account.

    An administrator cannot delete their own account.
    """

    # ========================================================
    # FIND USER
    # ========================================================

    result = await db.execute(
        select(User).where(
            User.id == user_id,
        ),
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # ========================================================
    # PREVENT SELF DELETION
    # ========================================================

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    # ========================================================
    # DELETE USER
    # ========================================================

    await db.delete(user)

    await db.commit()

    return {
        "message": "User deleted successfully",
    }
