from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# ============================================================
# DATABASE MODELS
# ============================================================
from app.database.base import Base
from app.database.models.behavioral_profile import (
    BehavioralProfile,  # noqa: F401
)
from app.database.models.face_embedding import FaceEmbedding  # noqa: F401
from app.database.models.faculty import Faculty  # noqa: F401
from app.database.models.nfc_card import NFCCard  # noqa: F401
from app.database.models.notice import Notice  # noqa: F401
from app.database.models.student import Student  # noqa: F401
from app.database.models.user import User  # noqa: F401
from app.database.session import engine

# ============================================================
# ROUTES
# ============================================================
from app.routes import (
    admin_attendance_router,
    admin_faculty_router,
    admin_history_router,
    admin_reports_router,
    admin_router,
    admin_students_router,
    attendance_router,
    auth_router,
    behavior_router,
    calendar_router,
    face_data_router,
    face_router,
    faculty_dashboard_router,
    faculty_router,
    nfc_router,
    notices_router,
    student_dashboard_router,
    students_router,
)

# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Smart Attendance System API",
    version="1.0.0",
    description=(
        "Backend API for the Smart Attendance System "
        "with Face Recognition, NFC, Attendance Analytics, "
        "Behavioral Analytics, Notices, and Role-Based Access."
    ),
)

# ============================================================
# DATABASE TABLES
# ============================================================


@app.on_event("startup")
async def startup_event() -> None:
    """
    Create database tables automatically on application startup.
    """

    async with engine.begin() as conn:
        await conn.run_sync(
            Base.metadata.create_all,
        )


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# UPLOAD DIRECTORIES
# ============================================================

UPLOAD_DIRECTORY = Path(__file__).resolve().parent / "uploads"

STUDENTS_UPLOAD_DIRECTORY = UPLOAD_DIRECTORY / "students"

FACULTY_UPLOAD_DIRECTORY = UPLOAD_DIRECTORY / "faculty"

# Create directories automatically.

STUDENTS_UPLOAD_DIRECTORY.mkdir(
    parents=True,
    exist_ok=True,
)

FACULTY_UPLOAD_DIRECTORY.mkdir(
    parents=True,
    exist_ok=True,
)

# ============================================================
# STATIC UPLOADS
# ============================================================

app.mount(
    "/uploads",
    StaticFiles(
        directory=UPLOAD_DIRECTORY,
    ),
    name="uploads",
)

# ============================================================
# API ROUTES
# ============================================================

# ------------------------------------------------------------
# Authentication
# ------------------------------------------------------------

app.include_router(
    auth_router,
)

# ------------------------------------------------------------
# Student
# ------------------------------------------------------------

app.include_router(
    students_router,
)

app.include_router(
    student_dashboard_router,
)

# ------------------------------------------------------------
# Faculty
# ------------------------------------------------------------

app.include_router(
    faculty_router,
)

app.include_router(
    faculty_dashboard_router,
)

# ------------------------------------------------------------
# Admin
# ------------------------------------------------------------

app.include_router(
    admin_router,
)

app.include_router(
    admin_students_router,
)

app.include_router(
    admin_faculty_router,
)

app.include_router(
    admin_attendance_router,
)

app.include_router(
    admin_history_router,
)

# ------------------------------------------------------------
# Admin Reports
# ------------------------------------------------------------

app.include_router(
    admin_reports_router,
)

# ------------------------------------------------------------
# General Attendance
# ------------------------------------------------------------

app.include_router(
    attendance_router,
)

# ------------------------------------------------------------
# Behavioral Analytics
# ------------------------------------------------------------

app.include_router(
    behavior_router,
)

# ------------------------------------------------------------
# Face Recognition
# ------------------------------------------------------------

app.include_router(
    face_router,
)

# ------------------------------------------------------------
# Face Data
# ------------------------------------------------------------

app.include_router(
    face_data_router,
)

# ------------------------------------------------------------
# NFC
# ------------------------------------------------------------

app.include_router(
    nfc_router,
)

# ------------------------------------------------------------
# Notices
# ------------------------------------------------------------

app.include_router(
    notices_router,
)

# ------------------------------------------------------------
# Calendar
# ------------------------------------------------------------

app.include_router(
    calendar_router,
)

# ============================================================
# ROOT
# ============================================================


@app.get("/")
async def root() -> dict[str, str]:
    """
    Return the API welcome message.
    """

    return {
        "message": "Smart Attendance System API",
    }


# ============================================================
# HEALTH CHECK
# ============================================================


@app.get("/health")
async def health() -> dict[str, str]:
    """
    Check whether the API is running.
    """

    return {
        "status": "healthy",
    }
