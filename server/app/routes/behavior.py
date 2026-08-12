from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.behavioral_profile import BehavioralProfile
from app.database.models.faculty import Faculty
from app.database.models.student import Student
from app.database.session import get_db
from app.schemas.behavioral_profile import (
    BehavioralProfileResponse,
)
from app.services.behavior_analytics import (
    calculate_behavioral_profile,
    get_behavioral_profile,
)


router = APIRouter(
    prefix="/behavior",
    tags=["Behavior Analytics"],
)


# ============================================================
# STUDENT BEHAVIOR
# ============================================================


@router.get(
    "/students/{student_id}",
    response_model=BehavioralProfileResponse,
    summary="Get student behavioral profile",
)
async def get_student_behavior(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> BehavioralProfileResponse:
    """
    Get the behavioral analytics profile of a student.
    """

    # --------------------------------------------------------
    # Verify student exists
    # --------------------------------------------------------

    result = await db.execute(select(Student).where(Student.id == student_id))

    student = result.scalar_one_or_none()

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    # --------------------------------------------------------
    # Get behavioral profile
    # --------------------------------------------------------

    profile = await get_behavioral_profile(
        db=db,
        person_id=student_id,
        person_type="student",
    )

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=("Behavioral profile has not been calculated yet"),
        )

    return BehavioralProfileResponse.model_validate(profile)


@router.post(
    "/students/{student_id}/calculate",
    response_model=BehavioralProfileResponse,
    summary="Calculate student behavioral profile",
)
async def calculate_student_behavior(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> BehavioralProfileResponse:
    """
    Calculate or recalculate behavioral analytics
    for a student using attendance history.
    """

    # --------------------------------------------------------
    # Verify student exists
    # --------------------------------------------------------

    result = await db.execute(select(Student).where(Student.id == student_id))

    student = result.scalar_one_or_none()

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    # --------------------------------------------------------
    # Calculate behavioral profile
    # --------------------------------------------------------

    profile = await calculate_behavioral_profile(
        db=db,
        person_id=student_id,
        person_type="student",
    )

    return BehavioralProfileResponse.model_validate(profile)


# ============================================================
# FACULTY BEHAVIOR
# ============================================================


@router.get(
    "/faculty/{faculty_id}",
    response_model=BehavioralProfileResponse,
    summary="Get faculty behavioral profile",
)
async def get_faculty_behavior(
    faculty_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> BehavioralProfileResponse:
    """
    Get the behavioral analytics profile of a faculty member.
    """

    # --------------------------------------------------------
    # Verify faculty exists
    # --------------------------------------------------------

    result = await db.execute(select(Faculty).where(Faculty.id == faculty_id))

    faculty = result.scalar_one_or_none()

    if faculty is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found",
        )

    # --------------------------------------------------------
    # Get behavioral profile
    # --------------------------------------------------------

    profile = await get_behavioral_profile(
        db=db,
        person_id=faculty_id,
        person_type="faculty",
    )

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=("Behavioral profile has not been calculated yet"),
        )

    return BehavioralProfileResponse.model_validate(profile)


@router.post(
    "/faculty/{faculty_id}/calculate",
    response_model=BehavioralProfileResponse,
    summary="Calculate faculty behavioral profile",
)
async def calculate_faculty_behavior(
    faculty_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> BehavioralProfileResponse:
    """
    Calculate or recalculate behavioral analytics
    for a faculty member using attendance history.
    """

    # --------------------------------------------------------
    # Verify faculty exists
    # --------------------------------------------------------

    result = await db.execute(select(Faculty).where(Faculty.id == faculty_id))

    faculty = result.scalar_one_or_none()

    if faculty is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty not found",
        )

    # --------------------------------------------------------
    # Calculate behavioral profile
    # --------------------------------------------------------

    profile = await calculate_behavioral_profile(
        db=db,
        person_id=faculty_id,
        person_type="faculty",
    )

    return BehavioralProfileResponse.model_validate(profile)
