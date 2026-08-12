from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.face_embedding import FaceEmbedding
from app.database.models.faculty import Faculty
from app.database.models.student import Student
from app.database.models.user import User
from app.database.session import get_db

router = APIRouter(
    prefix="/face-data",
    tags=["Face Data"],
)


@router.get("")
async def get_face_data(
    db: AsyncSession = Depends(get_db),
) -> dict[str, list[dict[str, Any]]]:
    """
    Return face-enrollment information for students and faculty.

    One face embedding represents one enrolled face photo.
    Five embeddings means the user has completed enrollment.
    """

    # --------------------------------------------------------
    # Aggregate face embeddings per user.
    # --------------------------------------------------------

    embedding_stats = (
        select(
            FaceEmbedding.user_id.label("user_id"),
            func.count(FaceEmbedding.id).label("embedding_count"),
            func.max(FaceEmbedding.updated_at).label("last_updated"),
        )
        .group_by(FaceEmbedding.user_id)
        .subquery()
    )

    # --------------------------------------------------------
    # Get users together with their student/faculty profile.
    # --------------------------------------------------------

    statement = (
        select(
            User,
            Student,
            Faculty,
            embedding_stats.c.embedding_count,
            embedding_stats.c.last_updated,
        )
        .outerjoin(
            Student,
            Student.user_id == User.id,
        )
        .outerjoin(
            Faculty,
            Faculty.user_id == User.id,
        )
        .outerjoin(
            embedding_stats,
            embedding_stats.c.user_id == User.id,
        )
        .where(
            User.role.in_(["student", "faculty"]),
        )
        .order_by(User.created_at.desc())
    )

    result = await db.execute(statement)

    rows = result.all()

    data: list[dict[str, Any]] = []

    for user, student, faculty, embedding_count, last_updated in rows:
        # ----------------------------------------------------
        # Determine whether this is a student or faculty user.
        # ----------------------------------------------------

        if student is not None:
            person_id = student.student_id
            full_name = student.full_name
            role = "student"

        elif faculty is not None:
            person_id = faculty.faculty_id
            full_name = faculty.full_name
            role = "faculty"

        else:
            # A user without a matching student/faculty profile
            # should not normally exist, but handle it safely.
            person_id = user.login_id
            full_name = user.login_id
            role = user.role.value if hasattr(user.role, "value") else str(user.role)

        # ----------------------------------------------------
        # Convert SQL count to an integer.
        # ----------------------------------------------------

        photo_count = int(embedding_count or 0)

        # ----------------------------------------------------
        # Five embeddings = completed enrollment.
        # ----------------------------------------------------

        is_enrolled = photo_count >= 5

        data.append(
            {
                "id": str(user.id),
                "student_id": person_id if role == "student" else None,
                "faculty_id": person_id if role == "faculty" else None,
                "person_id": person_id,
                "full_name": full_name,
                "name": full_name,
                "email": user.email,
                "role": role,
                "photo_count": photo_count,
                "photos": photo_count,
                "embedding_count": photo_count,
                "embeddings": photo_count,
                "is_enrolled": is_enrolled,
                "enrolled": is_enrolled,
                "updated_at": (
                    last_updated.isoformat() if last_updated is not None else None
                ),
            }
        )

    return {
        "data": data,
    }
