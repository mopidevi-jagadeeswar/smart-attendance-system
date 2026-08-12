from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.nfc_card import NFCCard
from app.database.models.student import Student
from app.database.session import get_db

router = APIRouter(
    prefix="/nfc",
    tags=["NFC"],
)


# ============================================================
# REQUEST MODELS
# ============================================================


class NFCVerifyRequest(BaseModel):
    card_id: str = Field(min_length=1, max_length=100)


class NFCRegisterRequest(BaseModel):
    card_uid: str = Field(min_length=1, max_length=100)
    student_id: str | None = None


class NFCStatusRequest(BaseModel):
    status: str


# ============================================================
# GET ALL NFC CARDS
# GET /nfc
# ============================================================


@router.get("")
async def get_nfc_cards(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return all registered NFC cards."""

    result = await db.execute(select(NFCCard).order_by(NFCCard.created_at.desc()))

    cards = result.scalars().all()

    data: list[dict[str, Any]] = []

    for card in cards:
        student_name: str | None = None
        student_identifier: str | None = None

        if card.student_id is not None:
            student_result = await db.execute(
                select(Student).where(Student.id == card.student_id)
            )

            student = student_result.scalar_one_or_none()

            if student is not None:
                student_name = student.full_name
                student_identifier = student.student_id

        if not card.is_active:
            card_status = "blocked"
        elif card.student_id is None:
            card_status = "unassigned"
        else:
            card_status = "active"

        data.append(
            {
                "id": str(card.id),
                "card_uid": card.card_uid,
                "student_id": student_identifier,
                "student_name": student_name,
                "status": card_status,
                "is_active": card.is_active,
                "created_at": (
                    card.created_at.isoformat() if card.created_at else None
                ),
            }
        )

    return {
        "success": True,
        "data": data,
        "total": len(data),
    }


# ============================================================
# REGISTER NFC CARD
# POST /nfc/register
# ============================================================


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
)
async def register_nfc_card(
    payload: NFCRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Register a new NFC card."""

    card_uid = payload.card_uid.strip()

    if not card_uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="NFC card UID is required.",
        )

    # --------------------------------------------------------
    # Check whether card already exists
    # --------------------------------------------------------

    existing_result = await db.execute(
        select(NFCCard).where(NFCCard.card_uid == card_uid)
    )

    existing_card = existing_result.scalar_one_or_none()

    if existing_card is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This NFC card is already registered.",
        )

    # --------------------------------------------------------
    # Find student
    # --------------------------------------------------------

    student = None

    if payload.student_id:
        student_identifier = payload.student_id.strip()

        student_result = await db.execute(
            select(Student).where(Student.student_id == student_identifier)
        )

        student = student_result.scalar_one_or_none()

        if student is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(f"Student '{student_identifier}' was not found."),
            )

        if not student.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The selected student is inactive.",
            )

        # ----------------------------------------------------
        # Check whether student already has an NFC card
        # ----------------------------------------------------

        assigned_result = await db.execute(
            select(NFCCard).where(NFCCard.student_id == student.id)
        )

        existing_student_card = assigned_result.scalar_one_or_none()

        if existing_student_card is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("This student already has an NFC card assigned."),
            )

    # --------------------------------------------------------
    # Create card
    # --------------------------------------------------------

    nfc_card = NFCCard(
        card_uid=card_uid,
        student_id=student.id if student else None,
        is_active=True,
    )

    db.add(nfc_card)

    await db.commit()
    await db.refresh(nfc_card)

    return {
        "success": True,
        "message": "NFC card registered successfully.",
        "data": {
            "id": str(nfc_card.id),
            "card_uid": nfc_card.card_uid,
            "student_id": (student.student_id if student else None),
            "student_name": (student.full_name if student else None),
            "status": ("active" if student else "unassigned"),
            "is_active": nfc_card.is_active,
            "created_at": (
                nfc_card.created_at.isoformat() if nfc_card.created_at else None
            ),
        },
    }


# ============================================================
# UPDATE NFC CARD STATUS
# PATCH /nfc/{card_id}/status
# ============================================================


@router.patch("/{card_id}/status")
async def update_nfc_status(
    card_id: UUID,
    payload: NFCStatusRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Activate or block an NFC card."""

    requested_status = payload.status.strip().lower()

    if requested_status not in {
        "active",
        "blocked",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'active' or 'blocked'.",
        )

    result = await db.execute(select(NFCCard).where(NFCCard.id == card_id))

    nfc_card = result.scalar_one_or_none()

    if nfc_card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NFC card not found.",
        )

    nfc_card.is_active = requested_status == "active"

    await db.commit()
    await db.refresh(nfc_card)

    return {
        "success": True,
        "message": (
            "NFC card activated." if nfc_card.is_active else "NFC card blocked."
        ),
        "data": {
            "id": str(nfc_card.id),
            "card_uid": nfc_card.card_uid,
            "is_active": nfc_card.is_active,
            "status": ("active" if nfc_card.is_active else "blocked"),
        },
    }


# ============================================================
# DELETE NFC CARD
# DELETE /nfc/{card_id}
# ============================================================


@router.delete("/{card_id}")
async def delete_nfc_card(
    card_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Delete an NFC card."""

    result = await db.execute(select(NFCCard).where(NFCCard.id == card_id))

    nfc_card = result.scalar_one_or_none()

    if nfc_card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NFC card not found.",
        )

    deleted_uid = nfc_card.card_uid

    await db.delete(nfc_card)
    await db.commit()

    return {
        "success": True,
        "message": "NFC card removed successfully.",
        "card_uid": deleted_uid,
    }


# ============================================================
# VERIFY NFC ATTENDANCE
# POST /nfc/verify-nfc
# ============================================================


@router.post("/verify-nfc")
async def verify_nfc_attendance(
    payload: NFCVerifyRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Verify an NFC card and return the associated student.

    This endpoint verifies the card and student.
    AttendanceLog creation can be added separately.
    """

    card_uid = payload.card_id.strip()

    if not card_uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="NFC card ID is required.",
        )

    # --------------------------------------------------------
    # Find NFC card
    # --------------------------------------------------------

    result = await db.execute(select(NFCCard).where(NFCCard.card_uid == card_uid))

    nfc_card = result.scalar_one_or_none()

    if nfc_card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NFC card not registered.",
        )

    # --------------------------------------------------------
    # Check card status
    # --------------------------------------------------------

    if not nfc_card.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This NFC card is inactive.",
        )

    # --------------------------------------------------------
    # Check student assignment
    # --------------------------------------------------------

    if nfc_card.student_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=("This NFC card is not assigned to a student."),
        )

    # --------------------------------------------------------
    # Find student
    # --------------------------------------------------------

    student_result = await db.execute(
        select(Student).where(Student.id == nfc_card.student_id)
    )

    student = student_result.scalar_one_or_none()

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=("Student assigned to this NFC card was not found."),
        )

    # --------------------------------------------------------
    # Check student status
    # --------------------------------------------------------

    if not student.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The student account is inactive.",
        )

    # --------------------------------------------------------
    # Return verified student
    # --------------------------------------------------------

    return {
        "success": True,
        "message": (f"Attendance verified for {student.full_name} via NFC."),
        "card_id": card_uid,
        "card_uid": card_uid,
        "student_id": student.student_id,
        "name": student.full_name,
        "department": student.department,
        "course": student.course,
        "year": student.year,
        "semester": student.semester,
        "section": student.section,
        "image_url": student.photo_url,
    }
