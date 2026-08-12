from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

# ============================================================
# FACULTY INFORMATION
# ============================================================


class FacultyDashboardProfile(BaseModel):
    """Faculty profile information."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    faculty_id: str
    name: str
    email: str
    phone: str | None = None
    department: str
    designation: str
    photo_url: str | None = None
    is_active: bool
    is_verified: bool


# ============================================================
# TODAY'S ATTENDANCE
# ============================================================


class FacultyAttendanceSummary(BaseModel):
    """Today's attendance statistics."""

    date: date
    attendance_rate: float
    total_marked: int
    present: int
    late: int
    absent: int


# ============================================================
# RECENT ATTENDANCE
# ============================================================


class RecentAttendanceRecord(BaseModel):
    """Single recent attendance record."""

    id: str
    student_id: str
    student_name: str
    time: datetime | None = None
    method: str | None = None
    status: str | None = None


# ============================================================
# ABSENT STUDENT
# ============================================================


class AbsentStudent(BaseModel):
    """Student who has not marked attendance today."""

    id: str
    student_id: str
    name: str
    department: str
    course: str
    year: int
    semester: int | None = None
    section: str | None = None
    photo_url: str | None = None


# ============================================================
# FACULTY DASHBOARD RESPONSE
# ============================================================


class FacultyDashboardResponse(BaseModel):
    """Complete faculty dashboard response."""

    success: bool
    faculty: FacultyDashboardProfile
    today: FacultyAttendanceSummary
    recent_attendance: list[RecentAttendanceRecord]
    absent_students: list[AbsentStudent]
