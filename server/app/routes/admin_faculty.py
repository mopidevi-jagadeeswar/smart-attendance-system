from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models.faculty import Faculty
from app.database.models.user import User
from app.database.session import get_db

# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/admin/faculty",
    tags=["Admin - Faculty"],
)


# ============================================================
# SCHEMAS
# ============================================================


class FacultyResponse(BaseModel):
    """
    Faculty information returned to the frontend.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    faculty_id: str
    full_name: str
    email: EmailStr
    phone: str | None = None
    department: str
    designation: str
    photo_url: str | None = None
    is_active: bool


class FacultyUpdate(BaseModel):
    """
    Fields that can be updated by the administrator.
    """

    full_name: str = Field(
        min_length=2,
        max_length=150,
    )

    email: EmailStr

    phone: str | None = Field(
        default=None,
        max_length=20,
    )

    department: str = Field(
        min_length=1,
        max_length=100,
    )

    designation: str = Field(
        min_length=1,
        max_length=100,
    )

    photo_url: str | None = Field(
        default=None,
        max_length=500,
    )

    is_active: bool = True


class FacultyStatusUpdate(BaseModel):
    """
    Used to activate or deactivate a faculty account.
    """

    is_active: bool


class FacultyListResponse(BaseModel):
    """
    Response wrapper for faculty listing.
    """

    total: int
    faculty: list[FacultyResponse]


# ============================================================
# HELPER
# ============================================================


async def get_faculty_or_404(
    faculty_id: UUID,
    db: AsyncSession,
) -> Faculty:
    """
    Find a faculty member and load the linked user.
    """

    result = await db.execute(
        select(Faculty)
        .options(
            selectinload(Faculty.user),
        )
        .where(Faculty.id == faculty_id)
    )

    faculty = result.scalar_one_or_none()

    if faculty is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty member not found.",
        )

    return faculty


# ============================================================
# GET ALL FACULTY
# ============================================================


@router.get(
    "",
    response_model=FacultyListResponse,
)
async def get_all_faculty(
    db: AsyncSession = Depends(get_db),
) -> FacultyListResponse:
    """
    Return all faculty members.

    Used by the admin Faculty page.
    """

    result = await db.execute(
        select(Faculty)
        .options(
            selectinload(Faculty.user),
        )
        .order_by(Faculty.created_at.desc())
    )

    faculty_members = list(result.scalars().all())

    response: list[FacultyResponse] = []

    for faculty in faculty_members:
        if faculty.user is None:
            continue

        response.append(
            FacultyResponse(
                id=faculty.id,
                faculty_id=faculty.faculty_id,
                full_name=faculty.full_name,
                email=faculty.user.email,
                phone=faculty.phone,
                department=faculty.department,
                designation=faculty.designation,
                photo_url=faculty.photo_url,
                is_active=faculty.is_active,
            )
        )

    return FacultyListResponse(
        total=len(response),
        faculty=response,
    )


# ============================================================
# GET SINGLE FACULTY
# ============================================================


@router.get(
    "/{faculty_id}",
    response_model=FacultyResponse,
)
async def get_faculty(
    faculty_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> FacultyResponse:
    """
    Return one faculty member.
    """

    faculty = await get_faculty_or_404(
        faculty_id,
        db,
    )

    if faculty.user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty user account not found.",
        )

    return FacultyResponse(
        id=faculty.id,
        faculty_id=faculty.faculty_id,
        full_name=faculty.full_name,
        email=faculty.user.email,
        phone=faculty.phone,
        department=faculty.department,
        designation=faculty.designation,
        photo_url=faculty.photo_url,
        is_active=faculty.is_active,
    )


# ============================================================
# UPDATE FACULTY
# ============================================================


@router.put(
    "/{faculty_id}",
    response_model=FacultyResponse,
)
async def update_faculty(
    faculty_id: UUID,
    payload: FacultyUpdate,
    db: AsyncSession = Depends(get_db),
) -> FacultyResponse:
    """
    Update faculty profile and linked user email/status.
    """

    faculty = await get_faculty_or_404(
        faculty_id,
        db,
    )

    if faculty.user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty user account not found.",
        )

    user = faculty.user

    # --------------------------------------------------------
    # Check email uniqueness
    # --------------------------------------------------------

    if payload.email.lower() != user.email.lower():
        email_result = await db.execute(select(User).where(User.email == payload.email))

        existing_user = email_result.scalar_one_or_none()

        if existing_user is not None and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email address is already registered.",
            )

    # --------------------------------------------------------
    # Update Faculty
    # --------------------------------------------------------

    faculty.full_name = payload.full_name.strip()

    faculty.phone = payload.phone.strip() if payload.phone else None

    faculty.department = payload.department.strip()

    faculty.designation = payload.designation.strip()

    faculty.photo_url = payload.photo_url

    faculty.is_active = payload.is_active

    # --------------------------------------------------------
    # Update User
    # --------------------------------------------------------

    user.email = payload.email.lower().strip()

    user.is_active = payload.is_active

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    await db.commit()

    await db.refresh(faculty)

    # Refresh relationship after commit
    await db.refresh(user)

    return FacultyResponse(
        id=faculty.id,
        faculty_id=faculty.faculty_id,
        full_name=faculty.full_name,
        email=user.email,
        phone=faculty.phone,
        department=faculty.department,
        designation=faculty.designation,
        photo_url=faculty.photo_url,
        is_active=faculty.is_active,
    )


# ============================================================
# UPDATE FACULTY STATUS
# ============================================================


@router.patch(
    "/{faculty_id}/status",
    response_model=FacultyResponse,
)
async def update_faculty_status(
    faculty_id: UUID,
    payload: FacultyStatusUpdate,
    db: AsyncSession = Depends(get_db),
) -> FacultyResponse:
    """
    Activate or deactivate a faculty member.
    """

    faculty = await get_faculty_or_404(
        faculty_id,
        db,
    )

    if faculty.user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty user account not found.",
        )

    faculty.is_active = payload.is_active

    faculty.user.is_active = payload.is_active

    await db.commit()

    await db.refresh(faculty)
    await db.refresh(faculty.user)

    return FacultyResponse(
        id=faculty.id,
        faculty_id=faculty.faculty_id,
        full_name=faculty.full_name,
        email=faculty.user.email,
        phone=faculty.phone,
        department=faculty.department,
        designation=faculty.designation,
        photo_url=faculty.photo_url,
        is_active=faculty.is_active,
    )


# ============================================================
# DELETE FACULTY
# ============================================================


@router.delete(
    "/{faculty_id}",
)
async def delete_faculty(
    faculty_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """
    Delete a faculty profile.

    The linked User account is intentionally kept,
    so that we do not accidentally remove authentication
    records or related face embeddings.
    """

    faculty = await get_faculty_or_404(
        faculty_id,
        db,
    )

    await db.delete(faculty)

    await db.commit()

    return {
        "message": "Faculty profile deleted successfully.",
    }
