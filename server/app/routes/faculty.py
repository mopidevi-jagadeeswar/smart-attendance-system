from __future__ import annotations

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
from app.database.models.faculty import Faculty
from app.database.models.user import User, UserRole
from app.database.session import get_db
from app.dependencies.auth import require_role
from app.services.face_service import face_service

# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/faculty",
    tags=["Faculty"],
)


# ============================================================
# CONFIGURATION
# ============================================================

password_hasher = PasswordHasher()

UPLOAD_DIRECTORY = Path(__file__).resolve().parent.parent.parent / "uploads" / "faculty"

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024

REQUIRED_FACE_IMAGES = 5


# ============================================================
# REGISTER FACULTY
# ============================================================


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
)
async def register_faculty(
    # --------------------------------------------------------
    # Authentication
    # --------------------------------------------------------
    current_user: Annotated[
        User,
        Depends(
            require_role(UserRole.ADMIN),
        ),
    ],
    # --------------------------------------------------------
    # Database
    # --------------------------------------------------------
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    # --------------------------------------------------------
    # Faculty identity
    # --------------------------------------------------------
    faculty_id: Annotated[
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
    # --------------------------------------------------------
    # Personal information
    # --------------------------------------------------------
    phone: Annotated[
        str | None,
        Form(),
    ] = None,
    # --------------------------------------------------------
    # Professional information
    # --------------------------------------------------------
    department: Annotated[
        str,
        Form(),
    ] = "",
    designation: Annotated[
        str,
        Form(),
    ] = "",
    # --------------------------------------------------------
    # Five face enrollment photos
    # --------------------------------------------------------
    face_images: Annotated[
        list[UploadFile],
        File(...),
    ] = [],
) -> dict:
    """
    Register a faculty member with five face images using optimized batch processing.
    """

    # ========================================================
    # CLEAN INPUT
    # ========================================================

    faculty_id = faculty_id.strip()
    full_name = full_name.strip()
    email = email.strip().lower()
    department = department.strip()
    designation = designation.strip()

    if phone:
        phone = phone.strip()

    # ========================================================
    # BASIC VALIDATION
    # ========================================================

    if not faculty_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faculty ID is required.",
        )

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required.",
        )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required.",
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 8 characters.",
        )

    if not department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department is required.",
        )

    if not designation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Designation is required.",
        )

    # ========================================================
    # FIVE PHOTO VALIDATION
    # ========================================================

    if len(face_images) != REQUIRED_FACE_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exactly {REQUIRED_FACE_IMAGES} face images are required.",
        )

    # ========================================================
    # CHECK DUPLICATE USER
    # ========================================================

    existing_user_result = await db.execute(
        select(User).where(
            or_(
                User.login_id == faculty_id,
                User.email == email,
            ),
        ),
    )

    existing_user = existing_user_result.scalar_one_or_none()

    if existing_user is not None:
        if existing_user.login_id == faculty_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Faculty ID already exists.",
            )

        if existing_user.email == email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email address already exists.",
            )

    # ========================================================
    # CHECK FACULTY TABLE
    # ========================================================

    existing_faculty_result = await db.execute(
        select(Faculty).where(
            Faculty.faculty_id == faculty_id,
        ),
    )

    existing_faculty = existing_faculty_result.scalar_one_or_none()

    if existing_faculty is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Faculty ID already exists.",
        )

    # ========================================================
    # PROCESS FIVE FACE IMAGES (BATCH OPTIMIZED)
    # ========================================================

    raw_image_contents: list[bytes] = []

    for photo_number, image in enumerate(
        face_images,
        start=1,
    ):
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Face image {photo_number}: "
                    "Only JPG, PNG, and WebP images are allowed."
                ),
            )

        image_content = await image.read()

        if not image_content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Face image {photo_number} is empty.",
            )

        if len(image_content) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Face image {photo_number} must be smaller than 5 MB.",
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
            detail="Face recognition batch processing failed.",
        ) from exc

    processed_images: list[dict] = []
    for photo_number, (image_content, embedding_result) in enumerate(
        zip(raw_image_contents, embedding_results, strict=True),
        start=1,
    ):
        processed_images.append(
            {
                "photo_number": photo_number,
                "content": image_content,
                "extension": ALLOWED_IMAGE_TYPES[
                    face_images[photo_number - 1].content_type
                ],
                "embedding": embedding_result.embedding,
                "model_name": embedding_result.model_name,
                "detector_backend": embedding_result.detector_backend,
            }
        )

    # ========================================================
    # CREATE USER + FACULTY + EMBEDDINGS
    # ========================================================

    saved_image_paths: list[Path] = []

    try:
        password_hash = password_hasher.hash(
            password,
        )

        user = User(
            login_id=faculty_id,
            email=email,
            password_hash=password_hash,
            role=UserRole.FACULTY,
            is_active=True,
            is_verified=True,
        )

        db.add(user)
        await db.flush()

        faculty_directory = UPLOAD_DIRECTORY / str(user.id)
        faculty_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        first_photo_url: str | None = None

        for processed_image in processed_images:
            photo_number = processed_image["photo_number"]
            extension = processed_image["extension"]
            image_content = processed_image["content"]

            filename = f"photo_{photo_number}{extension}"
            image_path = faculty_directory / filename

            image_path.write_bytes(image_content)
            saved_image_paths.append(image_path)

            image_relative_path = f"/uploads/faculty/{user.id}/{filename}"

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

        faculty = Faculty(
            user_id=user.id,
            faculty_id=faculty_id,
            full_name=full_name,
            phone=phone,
            photo_url=first_photo_url,
            department=department,
            designation=designation,
            is_active=True,
        )

        db.add(faculty)
        await db.commit()
        await db.refresh(faculty)

    except IntegrityError as exc:
        await db.rollback()
        for image_path in saved_image_paths:
            image_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Faculty ID or email already exists.",
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
        "message": "Faculty registered successfully",
        "faculty": {
            "id": str(faculty.id),
            "faculty_id": faculty.faculty_id,
            "login_id": user.login_id,
            "full_name": faculty.full_name,
            "email": user.email,
            "phone": faculty.phone,
            "photo_url": faculty.photo_url,
            "department": faculty.department,
            "designation": faculty.designation,
            "is_active": faculty.is_active,
            "face_images": [
                f"/uploads/faculty/{user.id}/photo_{item['photo_number']}{item['extension']}"
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
        },
    }


# ============================================================
# GET ALL FACULTY
# ============================================================


@router.get("")
async def get_faculty(
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
    Return all registered faculty members.
    """

    result = await db.execute(
        select(Faculty, User)
        .join(
            User,
            Faculty.user_id == User.id,
        )
        .order_by(
            Faculty.created_at.desc(),
        ),
    )

    rows = result.all()

    return [
        {
            "id": str(faculty.id),
            "faculty_id": faculty.faculty_id,
            "full_name": faculty.full_name,
            "email": user.email,
            "phone": faculty.phone,
            "department": faculty.department,
            "designation": faculty.designation,
            "is_active": faculty.is_active,
            "photo_url": faculty.photo_url,
        }
        for faculty, user in rows
    ]


# ============================================================
# FACULTY PROFILE
# ============================================================


@router.get("/me")
async def get_my_profile(
    current_user: Annotated[
        User,
        Depends(
            require_role(UserRole.FACULTY),
        ),
    ],
) -> dict[str, str]:
    """
    Return the currently authenticated faculty member's basic information.
    """

    return {
        "message": "Faculty authentication successful",
        "login_id": current_user.login_id,
        "role": current_user.role.value,
    }
