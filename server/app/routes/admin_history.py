from __future__ import annotations

from datetime import date, datetime
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models.attendance import (
    AttendanceLog,
    AttendanceMethod,
    AttendanceStatus,
)
from app.database.session import get_db

# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/v1/admin/history",
    tags=["Admin Attendance History"],
)


# ============================================================
# RESPONSE MODELS
# ============================================================


class HistoryRecord(BaseModel):
    id: str

    date: str
    time: str

    person_type: str

    student_id: str | None = None
    faculty_id: str | None = None

    name: str

    department: str | None = None

    method: str
    status: str

    check_in: str | None = None
    check_out: str | None = None

    confidence: float | None = None

    device_id: str | None = None


class HistorySummary(BaseModel):
    total_records: int
    present: int
    late: int
    absent: int
    attendance_rate: float


class HistoryResponse(BaseModel):
    records: list[HistoryRecord]

    page: int
    page_size: int
    total_records: int
    total_pages: int

    summary: HistorySummary


class HistoryRecordResponse(BaseModel):
    record: HistoryRecord


# ============================================================
# HELPER
# ============================================================


def enum_value(value: object) -> str:
    """Return an enum's value safely."""

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


def serialize_record(
    record: AttendanceLog,
) -> HistoryRecord:
    """Convert an AttendanceLog into a history response."""

    person_type = "unknown"

    student_id: str | None = None
    faculty_id: str | None = None

    name = "Unknown Person"
    department: str | None = None

    # ========================================================
    # STUDENT
    # ========================================================

    if record.student is not None:
        person_type = "student"

        student_id = record.student.student_id

        name = record.student.full_name

        department = record.student.department

    # ========================================================
    # FACULTY
    # ========================================================

    elif record.faculty is not None:
        person_type = "faculty"

        faculty_id = record.faculty.faculty_id

        name = record.faculty.full_name

        department = record.faculty.department

    # ========================================================
    # TIME
    # ========================================================

    time_string = ""

    if record.check_in_time is not None:
        time_string = record.check_in_time.strftime(
            "%I:%M %p",
        )

    # ========================================================
    # RESPONSE
    # ========================================================

    return HistoryRecord(
        id=str(record.id),
        date=record.attendance_date.isoformat(),
        time=time_string,
        person_type=person_type,
        student_id=student_id,
        faculty_id=faculty_id,
        name=name,
        department=department,
        method=enum_value(record.method),
        status=enum_value(record.status),
        check_in=format_datetime(
            record.check_in_time,
        ),
        check_out=format_datetime(
            record.check_out_time,
        ),
        confidence=record.confidence_score,
        device_id=record.device_id,
    )


# ============================================================
# BASE QUERY
# ============================================================


def history_query():
    """
    Build the base attendance history query.

    Only actual AttendanceLog records are returned.
    Virtual absent records from the daily attendance monitor
    are intentionally not generated here.
    """

    return select(AttendanceLog).options(
        selectinload(
            AttendanceLog.student,
        ),
        selectinload(
            AttendanceLog.faculty,
        ),
    )


# ============================================================
# GET ATTENDANCE HISTORY
# ============================================================


@router.get(
    "",
    response_model=HistoryResponse,
)
async def get_attendance_history(
    from_date: date | None = Query(
        default=None,
        description="Start date.",
    ),
    to_date: date | None = Query(
        default=None,
        description="End date.",
    ),
    person_type: str | None = Query(
        default=None,
        description="student or faculty.",
    ),
    status_filter: AttendanceStatus | None = Query(
        default=None,
        alias="status",
        description="present, late, or absent.",
    ),
    method: AttendanceMethod | None = Query(
        default=None,
        description="face, nfc, or manual.",
    ),
    search: str | None = Query(
        default=None,
        description="Search name, ID, or department.",
    ),
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    db: AsyncSession = Depends(get_db),
) -> HistoryResponse:
    """
    Return historical attendance records.

    Supports:

    - Date range
    - Student/faculty filter
    - Status filter
    - Attendance method filter
    - Name/ID/department search
    - Pagination
    - Summary statistics
    """

    # ========================================================
    # VALIDATE DATE RANGE
    # ========================================================

    if from_date is not None and to_date is not None and from_date > to_date:
        raise HTTPException(
            status_code=400,
            detail=("from_date cannot be later than to_date."),
        )

    # ========================================================
    # NORMALIZE PERSON TYPE
    # ========================================================

    normalized_person_type = None

    if person_type:
        normalized_person_type = person_type.strip().lower()

        if normalized_person_type not in {
            "student",
            "faculty",
        }:
            raise HTTPException(
                status_code=400,
                detail=("person_type must be 'student' or 'faculty'."),
            )

    # ========================================================
    # BASE QUERY
    # ========================================================

    stmt = history_query()

    # ========================================================
    # DATE FILTER
    # ========================================================

    if from_date is not None:
        stmt = stmt.where(AttendanceLog.attendance_date >= from_date)

    if to_date is not None:
        stmt = stmt.where(AttendanceLog.attendance_date <= to_date)

    # ========================================================
    # PERSON TYPE FILTER
    # ========================================================

    if normalized_person_type == "student":
        stmt = stmt.where(
            AttendanceLog.student_id.is_not(None),
        )

    elif normalized_person_type == "faculty":
        stmt = stmt.where(
            AttendanceLog.faculty_id.is_not(None),
        )

    # ========================================================
    # STATUS FILTER
    # ========================================================

    if status_filter is not None:
        stmt = stmt.where(
            AttendanceLog.status == status_filter,
        )

    # ========================================================
    # METHOD FILTER
    # ========================================================

    if method is not None:
        stmt = stmt.where(
            AttendanceLog.method == method,
        )

    # ========================================================
    # SEARCH
    #
    # Because Student and Faculty have different tables,
    # search is handled with EXISTS-style subqueries.
    # ========================================================

    if search:
        search_value = search.strip().lower()

        if search_value:
            student_match = (
                select(
                    AttendanceLog.id,
                )
                .join(
                    AttendanceLog.student,
                )
                .where(
                    AttendanceLog.id == AttendanceLog.id,
                    or_(
                        func.lower(
                            func.coalesce(
                                AttendanceLog.student.property.mapper.class_.full_name,
                                "",
                            )
                        ).contains(search_value),
                        func.lower(
                            func.coalesce(
                                AttendanceLog.student.property.mapper.class_.student_id,
                                "",
                            )
                        ).contains(search_value),
                        func.lower(
                            func.coalesce(
                                AttendanceLog.student.property.mapper.class_.department,
                                "",
                            )
                        ).contains(search_value),
                    ),
                )
            )

            # ------------------------------------------------
            # Use simpler direct relationship conditions.
            # ------------------------------------------------

            from app.database.models.faculty import Faculty
            from app.database.models.student import Student

            stmt = stmt.where(
                or_(
                    AttendanceLog.student.has(
                        or_(
                            func.lower(
                                Student.full_name,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Student.student_id,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Student.department,
                            ).contains(
                                search_value,
                            ),
                        )
                    ),
                    AttendanceLog.faculty.has(
                        or_(
                            func.lower(
                                Faculty.full_name,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Faculty.faculty_id,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Faculty.department,
                            ).contains(
                                search_value,
                            ),
                        )
                    ),
                )
            )

    # ========================================================
    # COUNT TOTAL
    # ========================================================

    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())

    count_result = await db.execute(
        count_stmt,
    )

    total_records = count_result.scalar() or 0

    total_pages = max(
        1,
        ceil(total_records / page_size),
    )

    # ========================================================
    # PAGINATION
    # ========================================================

    offset = (page - 1) * page_size

    stmt = (
        stmt.order_by(
            AttendanceLog.attendance_date.desc(),
            AttendanceLog.check_in_time.desc(),
        )
        .offset(offset)
        .limit(page_size)
    )

    # ========================================================
    # FETCH RECORDS
    # ========================================================

    result = await db.execute(stmt)

    records = result.scalars().all()

    history_records = [serialize_record(record) for record in records]

    # ========================================================
    # SUMMARY
    #
    # Summary is calculated across the filtered date/search
    # result, not just the current page.
    # ========================================================

    summary_stmt = select(
        AttendanceLog.status,
        func.count(AttendanceLog.id),
    ).select_from(stmt.order_by(None).offset(None).limit(None).subquery())

    # --------------------------------------------------------
    # Instead of relying on enum grouping from the paginated
    # query, build a separate filtered query.
    # --------------------------------------------------------

    summary_base = history_query()

    if from_date is not None:
        summary_base = summary_base.where(AttendanceLog.attendance_date >= from_date)

    if to_date is not None:
        summary_base = summary_base.where(AttendanceLog.attendance_date <= to_date)

    if normalized_person_type == "student":
        summary_base = summary_base.where(
            AttendanceLog.student_id.is_not(None),
        )

    elif normalized_person_type == "faculty":
        summary_base = summary_base.where(
            AttendanceLog.faculty_id.is_not(None),
        )

    if status_filter is not None:
        summary_base = summary_base.where(
            AttendanceLog.status == status_filter,
        )

    if method is not None:
        summary_base = summary_base.where(
            AttendanceLog.method == method,
        )

    if search:
        search_value = search.strip().lower()

        if search_value:
            from app.database.models.faculty import Faculty
            from app.database.models.student import Student

            summary_base = summary_base.where(
                or_(
                    AttendanceLog.student.has(
                        or_(
                            func.lower(
                                Student.full_name,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Student.student_id,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Student.department,
                            ).contains(
                                search_value,
                            ),
                        )
                    ),
                    AttendanceLog.faculty.has(
                        or_(
                            func.lower(
                                Faculty.full_name,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Faculty.faculty_id,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Faculty.department,
                            ).contains(
                                search_value,
                            ),
                        )
                    ),
                )
            )

    summary_query = select(
        AttendanceLog.status,
        func.count(AttendanceLog.id),
    ).select_from(summary_base.order_by(None).subquery())

    # ========================================================
    # SIMPLE AND RELIABLE SUMMARY
    # ========================================================

    summary_result = await db.execute(summary_base.order_by(None))

    summary_records = summary_result.scalars().all()

    present_count = 0
    late_count = 0
    absent_count = 0

    for record in summary_records:
        current_status = enum_value(record.status).lower()

        if current_status == "present":
            present_count += 1

        elif current_status == "late":
            late_count += 1

        elif current_status == "absent":
            absent_count += 1

    summary_total = present_count + late_count + absent_count

    attendance_rate = 0.0

    if summary_total > 0:
        attendance_rate = round(
            ((present_count + late_count) / summary_total) * 100,
            2,
        )

    # ========================================================
    # RESPONSE
    # ========================================================

    return HistoryResponse(
        records=history_records,
        page=page,
        page_size=page_size,
        total_records=total_records,
        total_pages=total_pages,
        summary=HistorySummary(
            total_records=summary_total,
            present=present_count,
            late=late_count,
            absent=absent_count,
            attendance_rate=attendance_rate,
        ),
    )


# ============================================================
# GET SINGLE HISTORY RECORD
# ============================================================


@router.get(
    "/{attendance_id}",
    response_model=HistoryRecordResponse,
)
async def get_history_record(
    attendance_id: str,
    db: AsyncSession = Depends(get_db),
) -> HistoryRecordResponse:
    """Return one historical attendance record."""

    try:
        from uuid import UUID

        record_uuid = UUID(
            attendance_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid attendance record ID.",
        ) from exc

    stmt = (
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

    result = await db.execute(stmt)

    record = result.scalar_one_or_none()

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Attendance record not found.",
        )

    return HistoryRecordResponse(
        record=serialize_record(record),
    )


# ============================================================
# SUMMARY ENDPOINT
# ============================================================


@router.get(
    "/summary",
    response_model=HistorySummary,
)
async def get_history_summary(
    from_date: date | None = Query(
        default=None,
    ),
    to_date: date | None = Query(
        default=None,
    ),
    person_type: str | None = Query(
        default=None,
    ),
    method: AttendanceMethod | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> HistorySummary:
    """
    Return attendance summary for the selected filters.

    This endpoint is useful for the summary cards on the
    Attendance History frontend.
    """

    if from_date is not None and to_date is not None and from_date > to_date:
        raise HTTPException(
            status_code=400,
            detail=("from_date cannot be later than to_date."),
        )

    stmt = select(
        AttendanceLog,
    ).options(
        selectinload(
            AttendanceLog.student,
        ),
        selectinload(
            AttendanceLog.faculty,
        ),
    )

    # ========================================================
    # DATE
    # ========================================================

    if from_date is not None:
        stmt = stmt.where(AttendanceLog.attendance_date >= from_date)

    if to_date is not None:
        stmt = stmt.where(AttendanceLog.attendance_date <= to_date)

    # ========================================================
    # PERSON TYPE
    # ========================================================

    if person_type:
        normalized = person_type.strip().lower()

        if normalized == "student":
            stmt = stmt.where(
                AttendanceLog.student_id.is_not(None),
            )

        elif normalized == "faculty":
            stmt = stmt.where(
                AttendanceLog.faculty_id.is_not(None),
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=("person_type must be 'student' or 'faculty'."),
            )

    # ========================================================
    # METHOD
    # ========================================================

    if method is not None:
        stmt = stmt.where(
            AttendanceLog.method == method,
        )

    # ========================================================
    # SEARCH
    # ========================================================

    if search:
        search_value = search.strip().lower()

        if search_value:
            from app.database.models.faculty import Faculty
            from app.database.models.student import Student

            stmt = stmt.where(
                or_(
                    AttendanceLog.student.has(
                        or_(
                            func.lower(
                                Student.full_name,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Student.student_id,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Student.department,
                            ).contains(
                                search_value,
                            ),
                        )
                    ),
                    AttendanceLog.faculty.has(
                        or_(
                            func.lower(
                                Faculty.full_name,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Faculty.faculty_id,
                            ).contains(
                                search_value,
                            ),
                            func.lower(
                                Faculty.department,
                            ).contains(
                                search_value,
                            ),
                        )
                    ),
                )
            )

    # ========================================================
    # FETCH
    # ========================================================

    result = await db.execute(stmt)

    records = result.scalars().all()

    # ========================================================
    # COUNT
    # ========================================================

    present = 0
    late = 0
    absent = 0

    for record in records:
        current_status = enum_value(
            record.status,
        ).lower()

        if current_status == "present":
            present += 1

        elif current_status == "late":
            late += 1

        elif current_status == "absent":
            absent += 1

    total = present + late + absent

    attendance_rate = 0.0

    if total > 0:
        attendance_rate = round(
            ((present + late) / total) * 100,
            2,
        )

    return HistorySummary(
        total_records=total,
        present=present,
        late=late,
        absent=absent,
        attendance_rate=attendance_rate,
    )
