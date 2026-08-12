from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.attendance import (
    AttendanceLog,
    AttendanceMethod,
    AttendanceStatus,
)
from app.database.models.face_embedding import FaceEmbedding
from app.database.models.faculty import Faculty
from app.database.models.student import Student
from app.database.session import get_db
from app.services.face_service import face_service

router = APIRouter(
    prefix="/api/v1/face",
    tags=["Face Recognition"],
)


# ============================================================
# FACE RECOGNITION + ATTENDANCE
# ============================================================


@router.post("/recognize")
async def recognize_face_attendance(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Recognize a registered student or faculty member.

    Pipeline:

        Camera image
            ↓
        FaceService
            ↓
        RetinaFace / OpenCV
            ↓
        ArcFace embedding
            ↓
        512-dimensional vector
            ↓
        pgvector cosine search
            ↓
        Match threshold
            ↓
        User
          ├── Student → student attendance
          └── Faculty → faculty attendance

    Admin users are not allowed to mark attendance.
    """

    try:
        # ========================================================
        # 1. VALIDATE UPLOAD
        # ========================================================

        if not file.content_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file.",
            )

        if not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must be an image.",
            )

        image_bytes = await file.read()

        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded image is empty.",
            )

        # ========================================================
        # 2. GENERATE LIVE FACE EMBEDDING
        # ========================================================

        try:
            embedding_result = face_service.generate_embedding_from_bytes(image_bytes)

        except ValueError as exc:
            message = str(exc)

            return {
                "recognized": False,
                "face_detected": False,
                "message": message,
            }

        except RuntimeError as exc:
            print(f"Face service runtime error: {exc}")

            return {
                "recognized": False,
                "face_detected": False,
                "message": "Face processing failed.",
            }

        # ========================================================
        # 3. GET LIVE EMBEDDING
        # ========================================================

        live_embedding = embedding_result.embedding

        if not live_embedding:
            return {
                "recognized": False,
                "face_detected": False,
                "message": "Face embedding was not generated.",
            }

        # ========================================================
        # 4. VALIDATE EMBEDDING DIMENSION
        # ========================================================

        if len(live_embedding) != 512:
            print(
                "Unexpected face embedding dimension:",
                len(live_embedding),
            )

            return {
                "recognized": False,
                "face_detected": True,
                "message": "Invalid face embedding dimension.",
            }

        # ========================================================
        # 5. FIND CLOSEST REGISTERED EMBEDDING
        # ========================================================

        distance_expression = FaceEmbedding.embedding.cosine_distance(live_embedding)

        result = await db.execute(
            select(
                FaceEmbedding,
                distance_expression.label("distance"),
            )
            .where(
                FaceEmbedding.model_name == face_service.model_name,
                FaceEmbedding.user_id.is_not(None),
            )
            .order_by(distance_expression)
            .limit(1)
        )

        match = result.first()

        # ========================================================
        # 6. NO REGISTERED EMBEDDINGS
        # ========================================================

        if match is None:
            return {
                "recognized": False,
                "face_detected": True,
                "message": "No registered face embeddings found.",
            }

        matched_embedding, distance = match

        distance = float(distance)
        threshold = face_service.threshold

        print(f"Face comparison: distance={distance:.4f} threshold={threshold:.4f}")

        # ========================================================
        # 7. REJECT UNKNOWN FACE
        # ========================================================

        if distance > threshold:
            print(f"Face rejected: distance={distance:.4f}")

            return {
                "recognized": False,
                "face_detected": True,
                "distance": round(distance, 4),
                "threshold": threshold,
                "message": "Face not recognized.",
            }

        # ========================================================
        # 8. GET MATCHED USER ID
        # ========================================================

        user_id = matched_embedding.user_id

        if user_id is None:
            return {
                "recognized": False,
                "face_detected": True,
                "distance": round(distance, 4),
                "message": "Matched face is not linked to a user.",
            }

        # ========================================================
        # 9. CHECK STUDENT PROFILE
        # ========================================================

        student_result = await db.execute(
            select(Student).where(Student.user_id == user_id)
        )

        student = student_result.scalar_one_or_none()

        # ========================================================
        # 10. STUDENT ATTENDANCE
        # ========================================================

        if student is not None:
            return await _process_student_attendance(
                db=db,
                student=student,
                distance=distance,
                threshold=threshold,
            )

        # ========================================================
        # 11. CHECK FACULTY PROFILE
        # ========================================================

        faculty_result = await db.execute(
            select(Faculty).where(Faculty.user_id == user_id)
        )

        faculty = faculty_result.scalar_one_or_none()

        # ========================================================
        # 12. FACULTY ATTENDANCE
        # ========================================================

        if faculty is not None:
            return await _process_faculty_attendance(
                db=db,
                faculty=faculty,
                distance=distance,
                threshold=threshold,
            )

        # ========================================================
        # 13. ADMIN / UNKNOWN USER
        # ========================================================

        return {
            "recognized": False,
            "face_detected": True,
            "distance": round(distance, 4),
            "threshold": threshold,
            "message": (
                "Face matched a registered user, "
                "but that user is not eligible for attendance."
            ),
        }

    # ============================================================
    # HTTP EXCEPTION
    # ============================================================

    except HTTPException:
        raise

    # ============================================================
    # UNEXPECTED ERROR
    # ============================================================

    except Exception as exc:
        await db.rollback()

        print(f"Error during face recognition: {exc}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Face recognition failed.",
        ) from exc


# ============================================================
# STUDENT ATTENDANCE
# ============================================================


async def _process_student_attendance(
    *,
    db: AsyncSession,
    student: Student,
    distance: float,
    threshold: float,
) -> dict:
    """
    Process attendance for a recognized student.

    This preserves the existing student attendance behavior.
    """

    # ========================================================
    # CHECK STUDENT STATUS
    # ========================================================

    if not student.is_active:
        return {
            "recognized": False,
            "face_detected": True,
            "distance": round(distance, 4),
            "threshold": threshold,
            "message": "This student account is inactive.",
        }

    # ========================================================
    # CURRENT DATE / TIME
    # ========================================================

    now = datetime.now(UTC)
    today = now.date()

    # ========================================================
    # CHECK WHETHER ALREADY MARKED TODAY
    # ========================================================

    existing_result = await db.execute(
        select(AttendanceLog)
        .where(
            AttendanceLog.student_id == student.id,
            AttendanceLog.attendance_date == today,
        )
        .limit(1)
    )

    existing_log = existing_result.scalar_one_or_none()

    # ========================================================
    # ALREADY MARKED
    # ========================================================

    if existing_log is not None:
        return {
            "recognized": True,
            "person_type": "student",
            "face_detected": True,
            "already_marked": True,
            "success": True,
            "distance": round(distance, 4),
            "threshold": threshold,
            "message": (f"{student.full_name} is already marked present today."),
            "id": str(existing_log.id),
            "student_id": student.student_id,
            "name": student.full_name,
            "department": student.department,
            "course": student.course,
            "year": str(student.year),
            "semester": (
                str(student.semester) if student.semester is not None else "N/A"
            ),
            "section": (student.section if student.section else "N/A"),
            "image_url": student.photo_url or "",
            "time": existing_log.check_in_time.strftime("%I:%M:%S %p"),
        }

    # ========================================================
    # CREATE STUDENT ATTENDANCE
    # ========================================================

    new_log = AttendanceLog(
        student_id=student.id,
        faculty_id=None,
        attendance_date=today,
        check_in_time=now,
        method=AttendanceMethod.FACE,
        status=AttendanceStatus.PRESENT,
        confidence_score=max(
            0.0,
            min(
                1.0,
                1.0 - (distance / threshold),
            ),
        ),
    )

    db.add(new_log)

    await db.commit()
    await db.refresh(new_log)

    # ========================================================
    # LOG SUCCESS
    # ========================================================

    print(
        "FACE RECOGNITION SUCCESS:"
        f" student={student.full_name}"
        f" student_id={student.student_id}"
        f" distance={distance:.4f}"
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "recognized": True,
        "person_type": "student",
        "face_detected": True,
        "already_marked": False,
        "success": True,
        "distance": round(distance, 4),
        "threshold": threshold,
        "message": (f"Attendance marked for {student.full_name} via Face Recognition."),
        "id": str(new_log.id),
        "student_id": student.student_id,
        "name": student.full_name,
        "department": student.department,
        "course": student.course,
        "year": str(student.year),
        "semester": (str(student.semester) if student.semester is not None else "N/A"),
        "section": (student.section if student.section else "N/A"),
        "image_url": student.photo_url or "",
        "time": new_log.check_in_time.strftime("%I:%M:%S %p"),
    }


# ============================================================
# FACULTY ATTENDANCE
# ============================================================


async def _process_faculty_attendance(
    *,
    db: AsyncSession,
    faculty: Faculty,
    distance: float,
    threshold: float,
) -> dict:
    """
    Process attendance for a recognized faculty member.

    Faculty attendance is stored using faculty_id.

    student_id remains NULL.
    """

    # ========================================================
    # CHECK FACULTY STATUS
    # ========================================================

    if not faculty.is_active:
        return {
            "recognized": False,
            "person_type": "faculty",
            "face_detected": True,
            "distance": round(distance, 4),
            "threshold": threshold,
            "message": "This faculty account is inactive.",
        }

    # ========================================================
    # CURRENT DATE / TIME
    # ========================================================

    now = datetime.now(UTC)
    today = now.date()

    # ========================================================
    # CHECK WHETHER ALREADY MARKED TODAY
    # ========================================================

    existing_result = await db.execute(
        select(AttendanceLog)
        .where(
            AttendanceLog.faculty_id == faculty.id,
            AttendanceLog.attendance_date == today,
        )
        .limit(1)
    )

    existing_log = existing_result.scalar_one_or_none()

    # ========================================================
    # ALREADY MARKED
    # ========================================================

    if existing_log is not None:
        return {
            "recognized": True,
            "person_type": "faculty",
            "face_detected": True,
            "already_marked": True,
            "success": True,
            "distance": round(distance, 4),
            "threshold": threshold,
            "message": (f"{faculty.full_name} is already marked present today."),
            "id": str(existing_log.id),
            "faculty_id": faculty.faculty_id,
            "name": faculty.full_name,
            "department": faculty.department,
            "designation": faculty.designation,
            "image_url": faculty.photo_url or "",
            "time": existing_log.check_in_time.strftime("%I:%M:%S %p"),
        }

    # ========================================================
    # CREATE FACULTY ATTENDANCE
    # ========================================================

    new_log = AttendanceLog(
        student_id=None,
        faculty_id=faculty.id,
        attendance_date=today,
        check_in_time=now,
        method=AttendanceMethod.FACE,
        status=AttendanceStatus.PRESENT,
        confidence_score=max(
            0.0,
            min(
                1.0,
                1.0 - (distance / threshold),
            ),
        ),
    )

    db.add(new_log)

    await db.commit()
    await db.refresh(new_log)

    # ========================================================
    # LOG SUCCESS
    # ========================================================

    print(
        "FACULTY FACE RECOGNITION SUCCESS:"
        f" faculty={faculty.full_name}"
        f" faculty_id={faculty.faculty_id}"
        f" distance={distance:.4f}"
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "recognized": True,
        "person_type": "faculty",
        "face_detected": True,
        "already_marked": False,
        "success": True,
        "distance": round(distance, 4),
        "threshold": threshold,
        "message": (f"Attendance marked for {faculty.full_name} via Face Recognition."),
        "id": str(new_log.id),
        "faculty_id": faculty.faculty_id,
        "name": faculty.full_name,
        "department": faculty.department,
        "designation": faculty.designation,
        "image_url": faculty.photo_url or "",
        "time": new_log.check_in_time.strftime("%I:%M:%S %p"),
    }
