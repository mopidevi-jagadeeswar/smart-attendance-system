from app.routes.admin import router as admin_router
from app.routes.admin_attendance import router as admin_attendance_router
from app.routes.admin_faculty import router as admin_faculty_router
from app.routes.admin_history import router as admin_history_router
from app.routes.admin_reports import router as admin_reports_router
from app.routes.admin_students import router as admin_students_router
from app.routes.attendance import router as attendance_router
from app.routes.auth import router as auth_router
from app.routes.behavior import router as behavior_router
from app.routes.calendar import router as calendar_router
from app.routes.face import router as face_router
from app.routes.face_data import router as face_data_router
from app.routes.faculty import router as faculty_router
from app.routes.faculty_dashboard import (
    router as faculty_dashboard_router,
)
from app.routes.nfc import router as nfc_router
from app.routes.notices import router as notices_router
from app.routes.student_dashboard import (
    router as student_dashboard_router,
)
from app.routes.students import router as students_router


__all__ = [
    "admin_attendance_router",
    "admin_faculty_router",
    "admin_history_router",
    "admin_reports_router",
    "admin_router",
    "admin_students_router",
    "attendance_router",
    "auth_router",
    "behavior_router",
    "calendar_router",
    "face_data_router",
    "face_router",
    "faculty_dashboard_router",
    "faculty_router",
    "nfc_router",
    "notices_router",
    "student_dashboard_router",
    "students_router",
]
