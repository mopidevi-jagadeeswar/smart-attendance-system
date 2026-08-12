from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models.attendance import (
    AttendanceLog,
    AttendanceMethod,
    AttendanceStatus,
)
from app.database.models.faculty import Faculty
from app.database.models.student import Student
from app.database.session import get_db


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/v1/admin/attendance",
    tags=["Admin Attendance"],
)


# ============================================================
# TYPES
# ============================================================

PersonType = Literal["student", "faculty"]


# ============================================================
# RESPONSE MODEL
# ============================================================


class AdminAttendanceResponse(BaseModel):
    id: str

    person_type: str

    student_id: str | None = None
    faculty_id: str | None = None

    name: str

    department: str | None = None

    attendance_date: str

    check_in_time: str | None = None
    check_out_time: str | None = None

    method: str
    status: str

    confidence_score: float | None = None

    device_id: str | None = None

    created_at: str | None = None


# ============================================================
# CREATE REQUEST
# ============================================================


class AdminAttendanceCreateRequest(BaseModel):
    person_type: PersonType

    person_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    attendance_date: date

    check_in_time: datetime

    check_out_time: datetime | None = None

    method: AttendanceMethod = AttendanceMethod.MANUAL

    status: AttendanceStatus = AttendanceStatus.PRESENT

    confidence_score: float | None = Field(
        default=None,
        ge=0,
        le=1,
    )

    device_id: str | None = Field(
        default=None,
        max_length=100,
    )


# ============================================================
# UPDATE REQUEST
# ============================================================


class AdminAttendanceUpdateRequest(BaseModel):
    attendance_date: date | None = None

    check_in_time: datetime | None = None

    check_out_time: datetime | None = None

    method: AttendanceMethod | None = None

    status: AttendanceStatus | None = None

    confidence_score: float | None = Field(
        default=None,
        ge=0,
        le=1,
    )

    device_id: str | None = Field(
        default=None,
        max_length=100,
    )


# ============================================================
# HELPER FUNCTIONS
# ============================================================


def enum_value(value: object) -> str:
    """Return the value of an enum safely."""

    if hasattr(value, "value"):
        return str(value.value)

    return str(value)


def format_datetime(
    value: datetime | None,
) -> str | None:
    """Convert datetime to ISO format."""

    if value is None:
        return None

    return value.isoformat()


def format_date(
    value: date,
) -> str:
    """Convert date to YYYY-MM-DD."""

    return value.isoformat()


def make_virtual_absent_id(
    person_type: str,
    person_id: str,
    attendance_date: date,
) -> str:
    """
    Generate the ID used for calculated absent records.

    Example:

    absent-student-MCA002-2026-08-11
    """

    return f"absent-{person_type}-{person_id}-{attendance_date.isoformat()}"


# ============================================================
# SERIALIZE DATABASE RECORD
# ============================================================


def serialize_attendance(
    record: AttendanceLog,
) -> AdminAttendanceResponse:
    """Convert an AttendanceLog into the frontend response."""

    person_type = "unknown"

    student_id: str | None = None
    faculty_id: str | None = None

    name = "Unknown Person"

    department: str | None = None

    # --------------------------------------------------------
    # STUDENT
    # --------------------------------------------------------

    if record.student is not None:
        person_type = "student"

        student_id = record.student.student_id

        name = record.student.full_name

        department = record.student.department

    # --------------------------------------------------------
    # FACULTY
    # --------------------------------------------------------

    elif record.faculty is not None:
        person_type = "faculty"

        faculty_id = record.faculty.faculty_id

        name = record.faculty.full_name

        department = record.faculty.department

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return AdminAttendanceResponse(
        id=str(record.id),
        person_type=person_type,
        student_id=student_id,
        faculty_id=faculty_id,
        name=name,
        department=department,
        attendance_date=format_date(
            record.attendance_date,
        ),
        check_in_time=format_datetime(
            record.check_in_time,
        ),
        check_out_time=format_datetime(
            record.check_out_time,
        ),
        method=enum_value(record.method),
        status=enum_value(record.status),
        confidence_score=record.confidence_score,
        device_id=record.device_id,
        created_at=format_datetime(
            record.created_at,
        ),
    )


# ============================================================
# VIRTUAL ABSENT STUDENT
# ============================================================


def make_absent_student(
    student: Student,
    selected_date: date,
) -> AdminAttendanceResponse:
    """Create a virtual absent student response."""

    return AdminAttendanceResponse(
        id=make_virtual_absent_id(
            "student",
            student.student_id,
            selected_date,
        ),
        person_type="student",
        student_id=student.student_id,
        faculty_id=None,
        name=student.full_name,
        department=student.department,
        attendance_date=selected_date.isoformat(),
        check_in_time=None,
        check_out_time=None,
        method="manual",
        status="absent",
        confidence_score=None,
        device_id=None,
        created_at=None,
    )


# ============================================================
# VIRTUAL ABSENT FACULTY
# ============================================================


def make_absent_faculty(
    faculty: Faculty,
    selected_date: date,
) -> AdminAttendanceResponse:
    """Create a virtual absent faculty response."""

    return AdminAttendanceResponse(
        id=make_virtual_absent_id(
            "faculty",
            faculty.faculty_id,
            selected_date,
        ),
        person_type="faculty",
        student_id=None,
        faculty_id=faculty.faculty_id,
        name=faculty.full_name,
        department=faculty.department,
        attendance_date=selected_date.isoformat(),
        check_in_time=None,
        check_out_time=None,
        method="manual",
        status="absent",
        confidence_score=None,
        device_id=None,
        created_at=None,
    )


# ============================================================
# GET COMPLETE ATTENDANCE
# ============================================================


@router.get(
    "",
    response_model=list[AdminAttendanceResponse],
)
async def get_admin_attendance(
    attendance_date: date | None = Query(
        default=None,
        description="Attendance date. Defaults to today.",
    ),
    person_type: PersonType | None = Query(
        default=None,
    ),
    status_filter: AttendanceStatus | None = Query(
        default=None,
        alias="status",
    ),
    method: AttendanceMethod | None = None,
    search: str | None = None,
    limit: int = Query(
        default=500,
        ge=1,
        le=1000,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    db: AsyncSession = Depends(get_db),
) -> list[AdminAttendanceResponse]:
    """
    Return complete attendance for a selected date.

    Every active student and faculty member is included.

    If a person has no attendance_logs record for that date,
    they are returned as a virtual ABSENT record.
    """

    selected_date = attendance_date if attendance_date is not None else date.today()

    # ========================================================
    # LOAD ACTIVE STUDENTS
    # ========================================================

    students_result = await db.execute(
        select(Student)
        .where(
            Student.is_active.is_(True),
        )
        .order_by(
            Student.full_name.asc(),
        )
    )

    students = students_result.scalars().all()

    # ========================================================
    # LOAD ACTIVE FACULTY
    # ========================================================

    faculty_result = await db.execute(
        select(Faculty)
        .where(
            Faculty.is_active.is_(True),
        )
        .order_by(
            Faculty.full_name.asc(),
        )
    )

    faculty_members = faculty_result.scalars().all()

    # ========================================================
    # LOAD ATTENDANCE LOGS
    # ========================================================

    attendance_result = await db.execute(
        select(AttendanceLog)
        .options(
            selectinload(
                AttendanceLog.student,
            ),
            selectinload(
                AttendanceLog.faculty,
            ),
        )
        .where(
            AttendanceLog.attendance_date == selected_date,
        )
        .order_by(
            AttendanceLog.check_in_time.desc(),
        )
    )

    attendance_records = attendance_result.scalars().all()

    # ========================================================
    # MAP ATTENDANCE
    # ========================================================

    student_attendance: dict[
        UUID,
        AttendanceLog,
    ] = {}

    faculty_attendance: dict[
        UUID,
        AttendanceLog,
    ] = {}

    for record in attendance_records:
        if record.student_id is not None:
            student_attendance[record.student_id] = record

        elif record.faculty_id is not None:
            faculty_attendance[record.faculty_id] = record

    # ========================================================
    # BUILD RESPONSE
    # ========================================================

    response: list[AdminAttendanceResponse] = []

    # ========================================================
    # STUDENTS
    # ========================================================

    if person_type in (
        None,
        "student",
    ):
        for student in students:
            record = student_attendance.get(
                student.id,
            )

            if record is not None:
                response.append(
                    serialize_attendance(
                        record,
                    )
                )
            else:
                response.append(
                    make_absent_student(
                        student,
                        selected_date,
                    )
                )

    # ========================================================
    # FACULTY
    # ========================================================

    if person_type in (
        None,
        "faculty",
    ):
        for faculty in faculty_members:
            record = faculty_attendance.get(
                faculty.id,
            )

            if record is not None:
                response.append(
                    serialize_attendance(
                        record,
                    )
                )
            else:
                response.append(
                    make_absent_faculty(
                        faculty,
                        selected_date,
                    )
                )

    # ========================================================
    # SEARCH FILTER
    # ========================================================

    if search:
        search_value = search.strip().lower()

        if search_value:
            response = [
                item
                for item in response
                if (
                    search_value in item.name.lower()
                    or search_value in (item.student_id or "").lower()
                    or search_value in (item.faculty_id or "").lower()
                    or search_value in (item.department or "").lower()
                )
            ]

    # ========================================================
    # STATUS FILTER
    # ========================================================

    if status_filter is not None:
        response = [item for item in response if item.status == status_filter.value]

    # ========================================================
    # METHOD FILTER
    # ========================================================

    if method is not None:
        response = [item for item in response if item.method == method.value]

    # ========================================================
    # SORT
    # ========================================================

    response.sort(
        key=lambda item: (
            item.check_in_time is None,
            item.check_in_time or "",
            item.name.lower(),
        ),
    )

    # ========================================================
    # PAGINATION
    # ========================================================

    return response[offset : offset + limit]


# ============================================================
# GET ONE ATTENDANCE RECORD
# ============================================================


@router.get(
    "/{attendance_id}",
    response_model=AdminAttendanceResponse,
)
async def get_attendance_record(
    attendance_id: str,
    db: AsyncSession = Depends(get_db),
) -> AdminAttendanceResponse:
    """Return one real attendance record."""

    try:
        record_uuid = UUID(attendance_id)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attendance record ID.",
        ) from exc

    result = await db.execute(
        select(AttendanceLog)
        .options(
            selectinload(
                AttendanceLog.student,
            ),
            selectinload(
                AttendanceLog.faculty,
            ),
        )
        .where(
            AttendanceLog.id == record_uuid,
        )
    )

    record = result.scalar_one_or_none()

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )

    return serialize_attendance(record)


# ============================================================
# CREATE MANUAL ATTENDANCE
# ============================================================


@router.post(
    "",
    response_model=AdminAttendanceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_admin_attendance(
    payload: AdminAttendanceCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> AdminAttendanceResponse:
    """
    Create a manual attendance record.

    person_id must be:

    student -> student_id
    faculty -> faculty_id
    """

    student: Student | None = None
    faculty: Faculty | None = None

    # ========================================================
    # FIND STUDENT
    # ========================================================

    if payload.person_type == "student":
        result = await db.execute(
            select(Student).where(
                Student.student_id == payload.person_id,
            )
        )

        student = result.scalar_one_or_none()

        if student is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found.",
            )

        if not student.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student account is inactive.",
            )

    # ========================================================
    # FIND FACULTY
    # ========================================================

    else:
        result = await db.execute(
            select(Faculty).where(
                Faculty.faculty_id == payload.person_id,
            )
        )

        faculty = result.scalar_one_or_none()

        if faculty is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty member not found.",
            )

        if not faculty.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Faculty account is inactive.",
            )

    # ========================================================
    # DUPLICATE CHECK
    # ========================================================

    if student is not None:
        duplicate_condition = AttendanceLog.student_id == student.id

    else:
        duplicate_condition = AttendanceLog.faculty_id == faculty.id

    duplicate_result = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.attendance_date == payload.attendance_date,
            duplicate_condition,
        )
    )

    existing = duplicate_result.scalar_one_or_none()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=("Attendance already exists for this person on this date."),
        )

    # ========================================================
    # CREATE
    # ========================================================

    record = AttendanceLog(
        student_id=(student.id if student is not None else None),
        faculty_id=(faculty.id if faculty is not None else None),
        attendance_date=payload.attendance_date,
        check_in_time=payload.check_in_time,
        check_out_time=payload.check_out_time,
        method=payload.method,
        status=payload.status,
        confidence_score=(payload.confidence_score),
        device_id=payload.device_id,
    )

    db.add(record)

    await db.commit()

    await db.refresh(record)

    # ========================================================
    # RELOAD RELATIONSHIPS
    # ========================================================

    result = await db.execute(
        select(AttendanceLog)
        .options(
            selectinload(
                AttendanceLog.student,
            ),
            selectinload(
                AttendanceLog.faculty,
            ),
        )
        .where(
            AttendanceLog.id == record.id,
        )
    )

    record = result.scalar_one()

    return serialize_attendance(record)


# ============================================================
# UPDATE ATTENDANCE
# ============================================================


@router.put(
    "/{attendance_id}",
    response_model=AdminAttendanceResponse,
)
async def update_admin_attendance(
    attendance_id: str,
    payload: AdminAttendanceUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> AdminAttendanceResponse:
    """Update an existing attendance record."""

    try:
        record_uuid = UUID(attendance_id)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attendance record ID.",
        ) from exc

    result = await db.execute(
        select(AttendanceLog)
        .options(
            selectinload(
                AttendanceLog.student,
            ),
            selectinload(
                AttendanceLog.faculty,
            ),
        )
        .where(
            AttendanceLog.id == record_uuid,
        )
    )

    record = result.scalar_one_or_none()

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )

    # ========================================================
    # UPDATE PROVIDED FIELDS
    # ========================================================

    if payload.attendance_date is not None:
        record.attendance_date = payload.attendance_date

    if payload.check_in_time is not None:
        record.check_in_time = payload.check_in_time

    if payload.check_out_time is not None:
        record.check_out_time = payload.check_out_time

    if payload.method is not None:
        record.method = payload.method

    if payload.status is not None:
        record.status = payload.status

    if payload.confidence_score is not None:
        record.confidence_score = payload.confidence_score

    if payload.device_id is not None:
        record.device_id = payload.device_id

    await db.commit()

    await db.refresh(record)

    # ========================================================
    # RELOAD
    # ========================================================

    result = await db.execute(
        select(AttendanceLog)
        .options(
            selectinload(
                AttendanceLog.student,
            ),
            selectinload(
                AttendanceLog.faculty,
            ),
        )
        .where(
            AttendanceLog.id == record.id,
        )
    )

    record = result.scalar_one()

    return serialize_attendance(record)


# ============================================================
# UPDATE STATUS
# ============================================================


@router.patch(
    "/{attendance_id}/status",
    response_model=AdminAttendanceResponse,
)
async def update_attendance_status(
    attendance_id: str,
    status_value: AttendanceStatus = Query(
        ...,
        alias="status",
    ),
    db: AsyncSession = Depends(get_db),
) -> AdminAttendanceResponse:
    """
    Change attendance status.

    Supports:

    1. Real UUID:
       Updates existing attendance record.

    2. Virtual absent ID:
       absent-student-MCA002-2026-08-11

       Creates a real attendance record when the
       admin changes the absent person's status.
    """

    # ========================================================
    # TRY REAL UUID
    # ========================================================

    try:
        record_uuid = UUID(attendance_id)

    except ValueError:
        record_uuid = None

    # ========================================================
    # REAL DATABASE RECORD
    # ========================================================

    if record_uuid is not None:
        result = await db.execute(
            select(AttendanceLog)
            .options(
                selectinload(
                    AttendanceLog.student,
                ),
                selectinload(
                    AttendanceLog.faculty,
                ),
            )
            .where(
                AttendanceLog.id == record_uuid,
            )
        )

        record = result.scalar_one_or_none()

        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found.",
            )

        record.status = status_value

        await db.commit()

        await db.refresh(record)

        # ----------------------------------------------------
        # Reload relationships
        # ----------------------------------------------------

        result = await db.execute(
            select(AttendanceLog)
            .options(
                selectinload(
                    AttendanceLog.student,
                ),
                selectinload(
                    AttendanceLog.faculty,
                ),
            )
            .where(
                AttendanceLog.id == record.id,
            )
        )

        record = result.scalar_one()

        return serialize_attendance(record)

    # ========================================================
    # VIRTUAL ABSENT RECORD
    # ========================================================
    #
    # Example:
    #
    # absent-student-MCA002-2026-08-11
    #
    # absent-faculty-FAC001-2026-08-11
    #
    # ========================================================

    parts = attendance_id.split("-")

    if len(parts) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attendance record ID.",
        )

    if parts[0] != "absent":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attendance record ID.",
        )

    virtual_person_type = parts[1]

    # --------------------------------------------------------
    # Date is always the last three components:
    #
    # 2026
    # 08
    # 11
    # --------------------------------------------------------

    date_string = "-".join(parts[-3:])

    # Everything between person type and date
    # is the actual student/faculty identifier.

    person_identifier = "-".join(parts[2:-3])

    # ========================================================
    # VALIDATE DATE
    # ========================================================

    try:
        attendance_date = date.fromisoformat(
            date_string,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attendance date.",
        ) from exc

    # ========================================================
    # STUDENT
    # ========================================================

    if virtual_person_type == "student":
        result = await db.execute(
            select(Student).where(
                Student.student_id == person_identifier,
            )
        )

        student = result.scalar_one_or_none()

        if student is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found.",
            )

        # ----------------------------------------------------
        # Check existing attendance
        # ----------------------------------------------------

        result = await db.execute(
            select(AttendanceLog).where(
                AttendanceLog.student_id == student.id,
                AttendanceLog.attendance_date == attendance_date,
            )
        )

        record = result.scalar_one_or_none()

        # ----------------------------------------------------
        # Existing record
        # ----------------------------------------------------

        if record is not None:
            record.status = status_value

        # ----------------------------------------------------
        # Create real attendance record
        # ----------------------------------------------------

        else:
            now = datetime.now().astimezone()

            record = AttendanceLog(
                student_id=student.id,
                faculty_id=None,
                attendance_date=attendance_date,
                check_in_time=now,
                check_out_time=None,
                method=AttendanceMethod.MANUAL,
                status=status_value,
                confidence_score=None,
                device_id="admin",
            )

            db.add(record)

    # ========================================================
    # FACULTY
    # ========================================================

    elif virtual_person_type == "faculty":
        result = await db.execute(
            select(Faculty).where(
                Faculty.faculty_id == person_identifier,
            )
        )

        faculty = result.scalar_one_or_none()

        if faculty is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty member not found.",
            )

        # ----------------------------------------------------
        # Check existing attendance
        # ----------------------------------------------------

        result = await db.execute(
            select(AttendanceLog).where(
                AttendanceLog.faculty_id == faculty.id,
                AttendanceLog.attendance_date == attendance_date,
            )
        )

        record = result.scalar_one_or_none()

        # ----------------------------------------------------
        # Existing record
        # ----------------------------------------------------

        if record is not None:
            record.status = status_value

        # ----------------------------------------------------
        # Create real attendance record
        # ----------------------------------------------------

        else:
            now = datetime.now().astimezone()

            record = AttendanceLog(
                student_id=None,
                faculty_id=faculty.id,
                attendance_date=attendance_date,
                check_in_time=now,
                check_out_time=None,
                method=AttendanceMethod.MANUAL,
                status=status_value,
                confidence_score=None,
                device_id="admin",
            )

            db.add(record)

    # ========================================================
    # INVALID PERSON TYPE
    # ========================================================

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid person type.",
        )

    # ========================================================
    # SAVE
    # ========================================================

    await db.commit()

    await db.refresh(record)

    # ========================================================
    # RELOAD RELATIONSHIPS
    # ========================================================

    result = await db.execute(
        select(AttendanceLog)
        .options(
            selectinload(
                AttendanceLog.student,
            ),
            selectinload(
                AttendanceLog.faculty,
            ),
        )
        .where(
            AttendanceLog.id == record.id,
        )
    )

    record = result.scalar_one()

    return serialize_attendance(record)


# ============================================================
# DELETE ATTENDANCE
# ============================================================


@router.delete(
    "/{attendance_id}",
)
async def delete_admin_attendance(
    attendance_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete an existing attendance record."""

    try:
        record_uuid = UUID(attendance_id)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attendance record ID.",
        ) from exc

    result = await db.execute(
        select(AttendanceLog).where(
            AttendanceLog.id == record_uuid,
        )
    )

    record = result.scalar_one_or_none()

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found.",
        )

    await db.delete(record)

    await db.commit()

    return {
        "message": ("Attendance record deleted successfully."),
        "id": attendance_id,
    }
