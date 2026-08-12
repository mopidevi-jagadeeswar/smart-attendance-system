from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import BaseModel, EmailStr
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.face_embedding import FaceEmbedding
from app.database.models.nfc_card import NFCCard
from app.database.models.student import Student
from app.database.models.user import User, UserRole
from app.database.session import get_db
from app.dependencies.auth import require_role
from app.services.face_service import face_service


# ==============================================================
# ROUTER
# ==============================================================

router = APIRouter(
    prefix="/admin/students",
    tags=["Admin Students"],
)


# ==============================================================
# CONFIGURATION
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
# REQUEST MODELS
# ==============================================================


class StudentUpdateRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    department: str
    course: str
    year: int
    semester: int | None = None
    section: str | None = None
    is_active: bool = True


class NFCRegisterRequest(BaseModel):
    card_uid: str


class NFCStatusRequest(BaseModel):
    is_active: bool


# ==============================================================
# HELPERS
# ==============================================================


async def get_student_and_user(
    student_uuid: UUID,
    db: AsyncSession,
) -> tuple[Student, User]:
    """
    Find a student and its associated user.
    """

    result = await db.execute(
        select(Student, User)
        .join(
            User,
            Student.user_id == User.id,
        )
        .where(
            Student.id == student_uuid,
        ),
    )

    row = result.one_or_none()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return row


async def get_student_or_404(
    student_uuid: UUID,
    db: AsyncSession,
) -> Student:
    """
    Find a student by UUID.
    """

    result = await db.execute(
        select(Student).where(
            Student.id == student_uuid,
        ),
    )

    student = result.scalar_one_or_none()

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    return student


def serialize_nfc_card(card: NFCCard) -> dict:
    """
    Convert an NFC card model to a JSON-safe dictionary.
    """

    return {
        "id": str(card.id),
        "student_id": str(card.student_id),
        "card_uid": card.card_uid,
        "is_active": card.is_active,
        "registered_at": (
            card.registered_at.isoformat() if card.registered_at else None
        ),
        "last_used_at": (card.last_used_at.isoformat() if card.last_used_at else None),
        "created_at": (card.created_at.isoformat() if card.created_at else None),
        "updated_at": (card.updated_at.isoformat() if card.updated_at else None),
    }


# ==============================================================
# VIEW STUDENT PROFILE
# ==============================================================


@router.get("/{student_uuid}")
async def get_student_profile(
    student_uuid: UUID,
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
) -> dict:
    """
    Return complete student profile information.

    Admin only.
    """

    student, user = await get_student_and_user(
        student_uuid,
        db,
    )

    # ----------------------------------------------------------
    # NFC CARDS
    # ----------------------------------------------------------

    nfc_result = await db.execute(
        select(NFCCard)
        .where(
            NFCCard.student_id == student.id,
        )
        .order_by(
            NFCCard.created_at.desc(),
        ),
    )

    nfc_cards = nfc_result.scalars().all()

    # ----------------------------------------------------------
    # FACE EMBEDDINGS
    # ----------------------------------------------------------

    face_result = await db.execute(
        select(FaceEmbedding)
        .where(
            FaceEmbedding.user_id == user.id,
        )
        .order_by(
            FaceEmbedding.photo_number.asc(),
        ),
    )

    face_embeddings = face_result.scalars().all()

    # ----------------------------------------------------------
    # RESPONSE
    # ----------------------------------------------------------

    return {
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
            "is_active": student.is_active,
            "is_verified": user.is_verified,
            "created_at": (
                student.created_at.isoformat() if student.created_at else None
            ),
            "updated_at": (
                student.updated_at.isoformat() if student.updated_at else None
            ),
        },
        "face_enrollment": {
            "count": len(face_embeddings),
            "required": REQUIRED_FACE_IMAGES,
            "status": (
                "completed"
                if len(face_embeddings) >= REQUIRED_FACE_IMAGES
                else "incomplete"
            ),
            "model": (face_embeddings[0].model_name if face_embeddings else None),
            "detector": (
                face_embeddings[0].detector_backend if face_embeddings else None
            ),
        },
        "nfc_cards": [serialize_nfc_card(card) for card in nfc_cards],
    }


# ==============================================================
# UPDATE STUDENT PROFILE
# ==============================================================


@router.put("/{student_uuid}")
async def update_student_profile(
    student_uuid: UUID,
    payload: StudentUpdateRequest,
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
) -> dict:
    """
    Update an existing student's personal and academic profile.
    """

    student, user = await get_student_and_user(
        student_uuid,
        db,
    )

    # ----------------------------------------------------------
    # CLEAN INPUT
    # ----------------------------------------------------------

    full_name = payload.full_name.strip()
    email = str(payload.email).strip().lower()
    department = payload.department.strip()
    course = payload.course.strip()

    phone = payload.phone.strip() if payload.phone else None

    gender = payload.gender.strip() if payload.gender else None

    section = payload.section.strip() if payload.section else None

    # ----------------------------------------------------------
    # VALIDATION
    # ----------------------------------------------------------

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required",
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

    if payload.year < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid academic year",
        )

    if payload.semester is not None and payload.semester < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid semester",
        )

    # ----------------------------------------------------------
    # CHECK DUPLICATE EMAIL
    # ----------------------------------------------------------

    email_result = await db.execute(
        select(User).where(
            User.email == email,
            User.id != user.id,
        ),
    )

    existing_email_user = email_result.scalar_one_or_none()

    if existing_email_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email address already exists",
        )

    # ----------------------------------------------------------
    # UPDATE USER
    # ----------------------------------------------------------

    user.email = email
    user.is_active = payload.is_active

    # ----------------------------------------------------------
    # UPDATE STUDENT
    # ----------------------------------------------------------

    student.full_name = full_name
    student.phone = phone
    student.date_of_birth = payload.date_of_birth
    student.gender = gender
    student.department = department
    student.course = course
    student.year = payload.year
    student.semester = payload.semester
    student.section = section
    student.is_active = payload.is_active

    # ----------------------------------------------------------
    # SAVE
    # ----------------------------------------------------------

    try:
        await db.commit()

        await db.refresh(student)
        await db.refresh(user)

    except IntegrityError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to update student because the data already exists",
        ) from exc

    return {
        "message": "Student profile updated successfully",
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
            "is_active": student.is_active,
        },
    }


# ==============================================================
# GET FACE ENROLLMENT STATUS
# ==============================================================


@router.get("/{student_uuid}/face")
async def get_face_enrollment(
    student_uuid: UUID,
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
) -> dict:
    """
    Return face enrollment status for a student.
    """

    student, user = await get_student_and_user(
        student_uuid,
        db,
    )

    result = await db.execute(
        select(FaceEmbedding)
        .where(
            FaceEmbedding.user_id == user.id,
        )
        .order_by(
            FaceEmbedding.photo_number.asc(),
        ),
    )

    embeddings = result.scalars().all()

    return {
        "student_id": str(student.id),
        "student_code": student.student_id,
        "face_enrollment": {
            "count": len(embeddings),
            "required": REQUIRED_FACE_IMAGES,
            "status": (
                "completed" if len(embeddings) >= REQUIRED_FACE_IMAGES else "incomplete"
            ),
            "model": (embeddings[0].model_name if embeddings else None),
            "detector": (embeddings[0].detector_backend if embeddings else None),
            "images": [
                {
                    "photo_number": embedding.photo_number,
                    "image_path": embedding.image_path,
                    "model_name": embedding.model_name,
                    "detector_backend": embedding.detector_backend,
                }
                for embedding in embeddings
            ],
        },
    }


# ==============================================================
# REPLACE FACE ENROLLMENT
# ==============================================================


@router.post("/{student_uuid}/face")
async def replace_face_enrollment(
    student_uuid: UUID,
    face_images: Annotated[
        list[UploadFile],
        File(...),
    ],
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
) -> dict:
    """
    Replace an existing student's face enrollment.

    Exactly five new face images are required.
    """

    student, user = await get_student_and_user(
        student_uuid,
        db,
    )

    # ----------------------------------------------------------
    # VALIDATE IMAGE COUNT
    # ----------------------------------------------------------

    if len(face_images) != REQUIRED_FACE_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(f"Exactly {REQUIRED_FACE_IMAGES} face images are required"),
        )

    # ----------------------------------------------------------
    # READ IMAGE DATA
    # ----------------------------------------------------------

    raw_image_contents: list[bytes] = []
    image_extensions: list[str] = []

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

        content = await image.read()

        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Face image {index} is empty",
            )

        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(f"Face image {index} must be smaller than 5 MB"),
            )

        raw_image_contents.append(content)
        image_extensions.append(ALLOWED_IMAGE_TYPES[image.content_type])

    # ----------------------------------------------------------
    # GENERATE NEW EMBEDDINGS
    # ----------------------------------------------------------

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
            detail="Face recognition processing failed",
        ) from exc

    if len(embedding_results) != REQUIRED_FACE_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=("Face recognition did not produce five valid embeddings"),
        )

    # ----------------------------------------------------------
    # STUDENT IMAGE DIRECTORY
    # ----------------------------------------------------------

    student_directory = UPLOAD_DIRECTORY / str(user.id)

    student_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    saved_paths: list[Path] = []

    # ----------------------------------------------------------
    # SAVE NEW IMAGES
    # ----------------------------------------------------------

    processed_images: list[dict] = []

    try:
        for index, (
            image_content,
            embedding_result,
            extension,
        ) in enumerate(
            zip(
                raw_image_contents,
                embedding_results,
                image_extensions,
                strict=True,
            ),
            start=1,
        ):
            filename = f"photo_{index}{extension}"

            image_path = student_directory / filename

            image_path.write_bytes(image_content)

            saved_paths.append(image_path)

            relative_path = f"/uploads/students/{user.id}/{filename}"

            processed_images.append(
                {
                    "photo_number": index,
                    "content": image_content,
                    "extension": extension,
                    "image_path": relative_path,
                    "embedding": embedding_result.embedding,
                    "model_name": (embedding_result.model_name),
                    "detector_backend": (embedding_result.detector_backend),
                }
            )

        # ------------------------------------------------------
        # DELETE OLD EMBEDDINGS
        # ------------------------------------------------------

        old_face_result = await db.execute(
            select(FaceEmbedding).where(
                FaceEmbedding.user_id == user.id,
            ),
        )

        old_embeddings = old_face_result.scalars().all()

        old_image_paths: list[Path] = []

        for old_embedding in old_embeddings:
            if old_embedding.image_path:
                old_path = Path(
                    __file__
                ).resolve().parent.parent.parent / old_embedding.image_path.lstrip("/")

                old_image_paths.append(old_path)

            await db.delete(old_embedding)

        await db.flush()

        # ------------------------------------------------------
        # CREATE NEW EMBEDDINGS
        # ------------------------------------------------------

        for processed in processed_images:
            embedding = FaceEmbedding(
                user_id=user.id,
                embedding=processed["embedding"],
                photo_number=processed["photo_number"],
                model_name=processed["model_name"],
                detector_backend=processed["detector_backend"],
                image_path=processed["image_path"],
            )

            db.add(embedding)

        # ------------------------------------------------------
        # UPDATE PROFILE PHOTO
        # ------------------------------------------------------

        student.photo_url = processed_images[0]["image_path"]

        await db.commit()

        await db.refresh(student)

        # ------------------------------------------------------
        # REMOVE OLD FILES
        # ------------------------------------------------------

        for old_path in old_image_paths:
            old_path.unlink(missing_ok=True)

    except Exception as exc:
        await db.rollback()

        for saved_path in saved_paths:
            saved_path.unlink(missing_ok=True)

        if isinstance(exc, HTTPException):
            raise

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update face enrollment",
        ) from exc

    return {
        "message": "Face enrollment updated successfully",
        "student_id": str(student.id),
        "face_enrollment": {
            "required": REQUIRED_FACE_IMAGES,
            "captured": len(processed_images),
            "embeddings_created": len(processed_images),
            "model": processed_images[0]["model_name"],
            "detector": processed_images[0]["detector_backend"],
            "status": "completed",
        },
    }


# ==============================================================
# GET NFC CARDS
# ==============================================================


@router.get("/{student_uuid}/nfc")
async def get_student_nfc_cards(
    student_uuid: UUID,
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
) -> dict:
    """
    Return all NFC cards assigned to a student.
    """

    student = await get_student_or_404(
        student_uuid,
        db,
    )

    result = await db.execute(
        select(NFCCard)
        .where(
            NFCCard.student_id == student.id,
        )
        .order_by(
            NFCCard.created_at.desc(),
        ),
    )

    cards = result.scalars().all()

    return {
        "student_id": str(student.id),
        "student_code": student.student_id,
        "nfc_cards": [serialize_nfc_card(card) for card in cards],
    }


# ==============================================================
# REGISTER / REPLACE NFC CARD
# ==============================================================


@router.post("/{student_uuid}/nfc")
async def register_student_nfc(
    student_uuid: UUID,
    payload: NFCRegisterRequest,
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
) -> dict:
    """
    Register an NFC card for a student.

    Existing active cards for this student are
    deactivated before the new card is assigned.
    """

    student = await get_student_or_404(
        student_uuid,
        db,
    )

    card_uid = payload.card_uid.strip()

    if not card_uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="NFC card UID is required",
        )

    # ----------------------------------------------------------
    # CHECK GLOBAL UID
    # ----------------------------------------------------------

    existing_result = await db.execute(
        select(NFCCard).where(
            NFCCard.card_uid == card_uid,
        ),
    )

    existing_card = existing_result.scalar_one_or_none()

    if existing_card is not None:
        if existing_card.student_id != student.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("This NFC card is already registered to another student"),
            )

        if existing_card.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("This NFC card is already active for this student"),
            )

        existing_card.is_active = True

        await db.commit()
        await db.refresh(existing_card)

        return {
            "message": "NFC card reactivated successfully",
            "nfc_card": serialize_nfc_card(existing_card),
        }

    # ----------------------------------------------------------
    # DEACTIVATE PREVIOUS ACTIVE CARDS
    # ----------------------------------------------------------

    active_result = await db.execute(
        select(NFCCard).where(
            NFCCard.student_id == student.id,
            NFCCard.is_active.is_(True),
        ),
    )

    active_cards = active_result.scalars().all()

    for card in active_cards:
        card.is_active = False

    # ----------------------------------------------------------
    # CREATE CARD
    # ----------------------------------------------------------

    new_card = NFCCard(
        student_id=student.id,
        card_uid=card_uid,
        is_active=True,
    )

    db.add(new_card)

    try:
        await db.commit()

        await db.refresh(new_card)

    except IntegrityError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This NFC card is already registered",
        ) from exc

    return {
        "message": "NFC card registered successfully",
        "nfc_card": serialize_nfc_card(new_card),
    }


# ==============================================================
# UPDATE NFC CARD STATUS
# ==============================================================


@router.patch(
    "/{student_uuid}/nfc/{card_uuid}",
)
async def update_nfc_status(
    student_uuid: UUID,
    card_uuid: UUID,
    payload: NFCStatusRequest,
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
) -> dict:
    """
    Activate or deactivate an NFC card.
    """

    student = await get_student_or_404(
        student_uuid,
        db,
    )

    result = await db.execute(
        select(NFCCard).where(
            NFCCard.id == card_uuid,
            NFCCard.student_id == student.id,
        ),
    )

    card = result.scalar_one_or_none()

    if card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NFC card not found",
        )

    # ----------------------------------------------------------
    # ACTIVATING CARD
    # ----------------------------------------------------------

    if payload.is_active:
        active_result = await db.execute(
            select(NFCCard).where(
                NFCCard.student_id == student.id,
                NFCCard.is_active.is_(True),
                NFCCard.id != card.id,
            ),
        )

        active_cards = active_result.scalars().all()

        for active_card in active_cards:
            active_card.is_active = False

    card.is_active = payload.is_active

    await db.commit()
    await db.refresh(card)

    return {
        "message": (
            "NFC card activated successfully"
            if card.is_active
            else "NFC card deactivated successfully"
        ),
        "nfc_card": serialize_nfc_card(card),
    }


# ==============================================================
# DELETE / DEACTIVATE NFC CARD
# ==============================================================


@router.delete(
    "/{student_uuid}/nfc/{card_uuid}",
)
async def delete_nfc_card(
    student_uuid: UUID,
    card_uuid: UUID,
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
) -> dict:
    """
    Deactivate an NFC card.

    The database record is preserved for audit/history.
    """

    student = await get_student_or_404(
        student_uuid,
        db,
    )

    result = await db.execute(
        select(NFCCard).where(
            NFCCard.id == card_uuid,
            NFCCard.student_id == student.id,
        ),
    )

    card = result.scalar_one_or_none()

    if card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NFC card not found",
        )

    card.is_active = False

    await db.commit()

    return {
        "message": "NFC card deactivated successfully",
        "card_uid": card.card_uid,
        "is_active": False,
    }
