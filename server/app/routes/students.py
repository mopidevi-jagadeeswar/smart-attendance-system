from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Annotated

from argon2 import PasswordHasher
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.face_embedding import FaceEmbedding
from app.database.models.student import Student
from app.database.models.user import User, UserRole
from app.database.session import get_db
from app.dependencies.auth import require_role
from app.services.face_service import face_service

# ==============================================================
# ROUTER
# ==============================================================

router = APIRouter(
    prefix="/students",
    tags=["Students"],
)


# ==============================================================
# PASSWORD HASHING
# ==============================================================

password_hasher = PasswordHasher()


# ==============================================================
# UPLOAD CONFIGURATION
# ==============================================================

UPLOAD_DIRECTORY = (
    Path(__file__).resolve().parent.parent.parent / "uploads" / "students"
)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024

REQUIRED_FACE_IMAGES = 5


# ==============================================================
# STUDENT REGISTRATION
# ==============================================================


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
)
async def register_student(
    # ----------------------------------------------------------
    # Admin authentication
    # ----------------------------------------------------------
    current_user: Annotated[
        User,
        Depends(
            require_role(UserRole.ADMIN),
        ),
    ],
    # ----------------------------------------------------------
    # Database
    # ----------------------------------------------------------
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    # ----------------------------------------------------------
    # Student identity
    # ----------------------------------------------------------
    student_id: Annotated[
        str,
        Form(),
    ],
    full_name: Annotated[
        str,
        Form(),
    ],
    email: Annotated[
        str,
        Form(),
    ],
    password: Annotated[
        str,
        Form(),
    ],
    # ----------------------------------------------------------
    # Personal information
    # ----------------------------------------------------------
    phone: Annotated[
        str | None,
        Form(),
    ] = None,
    date_of_birth: Annotated[
        date | None,
        Form(),
    ] = None,
    gender: Annotated[
        str | None,
        Form(),
    ] = None,
    # ----------------------------------------------------------
    # Academic information
    # ----------------------------------------------------------
    department: Annotated[
        str,
        Form(),
    ] = "",
    course: Annotated[
        str,
        Form(),
    ] = "",
    year: Annotated[
        int,
        Form(),
    ] = 0,
    semester: Annotated[
        int | None,
        Form(),
    ] = None,
    section: Annotated[
        str | None,
        Form(),
    ] = None,
    # ----------------------------------------------------------
    # AI face enrollment
    # ----------------------------------------------------------
    face_images: Annotated[
        list[UploadFile],
        File(...),
    ] = [],
) -> dict:
    """
    Register a new student with five face images using optimized batch processing.
    """

    # ==========================================================
    # CLEAN INPUT
    # ==========================================================

    student_id = student_id.strip()
    full_name = full_name.strip()
    email = email.strip().lower()
    department = department.strip()
    course = course.strip()

    if phone:
        phone = phone.strip()

    if gender:
        gender = gender.strip()

    if section:
        section = section.strip()

    # ==========================================================
    # BASIC VALIDATION
    # ==========================================================

    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student ID is required",
        )

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required",
        )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required",
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 8 characters",
        )

    if not department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department is required",
        )

    if not course:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course is required",
        )

    if year < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid academic year",
        )

    if semester is not None and semester < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid semester",
        )

    # ==========================================================
    # VALIDATE FACE IMAGE COUNT
    # ==========================================================

    if len(face_images) != REQUIRED_FACE_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exactly {REQUIRED_FACE_IMAGES} face images are required",
        )

    # ==========================================================
    # CHECK DUPLICATE USER
    # ==========================================================

    existing_user_result = await db.execute(
        select(User).where(
            or_(
                User.login_id == student_id,
                User.email == email,
            ),
        ),
    )

    existing_user = existing_user_result.scalar_one_or_none()

    if existing_user is not None:
        if existing_user.login_id == student_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Student ID already exists",
            )

        if existing_user.email == email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email address already exists",
            )

    # ==========================================================
    # CHECK DUPLICATE STUDENT
    # ==========================================================

    existing_student_result = await db.execute(
        select(Student).where(
            Student.student_id == student_id,
        ),
    )

    existing_student = existing_student_result.scalar_one_or_none()

    if existing_student is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student ID already exists",
        )

    # ==========================================================
    # PROCESS FIVE FACE IMAGES (BATCH OPTIMIZED)
    # ==========================================================

    raw_image_contents: list[bytes] = []

    for index, image in enumerate(
        face_images,
        start=1,
    ):
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Face image {index} has an invalid "
                    "format. Only JPG, PNG, and WebP "
                    "images are allowed."
                ),
            )

        image_content = await image.read()

        if not image_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Face image {index} is empty",
            )

        if len(image_content) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Face image {index} must be smaller than 5 MB",
            )

        raw_image_contents.append(image_content)

    try:
        embedding_results = face_service.generate_embeddings_batch(raw_image_contents)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Face recognition batch processing failed",
        ) from exc

    processed_images: list[dict] = []
    for index, (image_content, embedding_result) in enumerate(
        zip(raw_image_contents, embedding_results, strict=True),
        start=1,
    ):
        processed_images.append(
            {
                "photo_number": index,
                "content": image_content,
                "extension": ALLOWED_IMAGE_TYPES[face_images[index - 1].content_type],
                "embedding": embedding_result.embedding,
                "model_name": embedding_result.model_name,
                "detector_backend": embedding_result.detector_backend,
            }
        )

    # ==========================================================
    # CREATE USER + STUDENT + EMBEDDINGS
    # ==========================================================

    saved_image_paths: list[Path] = []

    try:
        password_hash = password_hasher.hash(
            password,
        )

        user = User(
            login_id=student_id,
            email=email,
            password_hash=password_hash,
            role=UserRole.STUDENT,
            is_active=True,
            is_verified=True,
        )

        db.add(user)
        await db.flush()

        student_directory = UPLOAD_DIRECTORY / str(user.id)
        student_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        first_photo_url: str | None = None

        for processed_image in processed_images:
            photo_number = processed_image["photo_number"]
            extension = processed_image["extension"]
            image_content = processed_image["content"]

            filename = f"photo_{photo_number}{extension}"
            image_path = student_directory / filename

            image_path.write_bytes(image_content)
            saved_image_paths.append(image_path)

            image_relative_path = f"/uploads/students/{user.id}/{filename}"

            if photo_number == 1:
                first_photo_url = image_relative_path

            face_embedding = FaceEmbedding(
                user_id=user.id,
                embedding=processed_image["embedding"],
                photo_number=photo_number,
                model_name=processed_image["model_name"],
                detector_backend=processed_image["detector_backend"],
                image_path=image_relative_path,
            )

            db.add(face_embedding)

        student = Student(
            user_id=user.id,
            student_id=student_id,
            full_name=full_name,
            phone=phone,
            date_of_birth=date_of_birth,
            gender=gender,
            photo_url=first_photo_url,
            department=department,
            course=course,
            year=year,
            semester=semester,
            section=section,
            is_active=True,
        )

        db.add(student)
        await db.commit()
        await db.refresh(student)

    except IntegrityError as exc:
        await db.rollback()
        for image_path in saved_image_paths:
            image_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student ID or email already exists",
        ) from exc

    except HTTPException:
        await db.rollback()
        for image_path in saved_image_paths:
            image_path.unlink(missing_ok=True)
        raise

    except Exception:
        await db.rollback()
        for image_path in saved_image_paths:
            image_path.unlink(missing_ok=True)
        raise

    return {
        "message": "Student registered successfully",
        "student": {
            "id": str(student.id),
            "student_id": student.student_id,
            "login_id": user.login_id,
            "full_name": student.full_name,
            "email": user.email,
            "phone": student.phone,
            "date_of_birth": (
                student.date_of_birth.isoformat() if student.date_of_birth else None
            ),
            "gender": student.gender,
            "department": student.department,
            "course": student.course,
            "year": student.year,
            "semester": student.semester,
            "section": student.section,
            "photo_url": student.photo_url,
            "face_images": [
                f"/uploads/students/{user.id}/photo_{item['photo_number']}{item['extension']}"
                for item in processed_images
            ],
            "face_enrollment": {
                "required": REQUIRED_FACE_IMAGES,
                "captured": len(processed_images),
                "embeddings_created": len(processed_images),
                "model": "ArcFace",
                "detector": "retinaface",
                "status": "completed",
            },
            "is_active": student.is_active,
        },
    }


# ==============================================================
# GET ALL STUDENTS
# ==============================================================


@router.get("")
async def get_students(
    current_user: Annotated[
        User,
        Depends(
            require_role(UserRole.ADMIN),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> list[dict]:
    """
    Return all registered students.
    """

    result = await db.execute(
        select(Student, User)
        .join(
            User,
            Student.user_id == User.id,
        )
        .order_by(
            Student.created_at.desc(),
        ),
    )

    rows = result.all()

    return [
        {
            "id": str(student.id),
            "student_id": student.student_id,
            "login_id": user.login_id,
            "full_name": student.full_name,
            "email": user.email,
            "department": student.department,
            "course": student.course,
            "year": student.year,
            "semester": student.semester,
            "section": student.section,
            "phone": student.phone,
            "photo_url": student.photo_url,
            "is_active": student.is_active,
        }
        for student, user in rows
    ]


# ==============================================================
# STUDENT AUTHENTICATION TEST
# ==============================================================


@router.get("/me")
async def get_my_profile(
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.STUDENT,
            ),
        ),
    ],
) -> dict[str, str]:
    """
    Return the authenticated student's basic information.
    """

    return {
        "message": "Student authentication successful",
        "login_id": current_user.login_id,
        "role": current_user.role.value,
    }
