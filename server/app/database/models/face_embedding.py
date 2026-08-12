from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from app.database.base import Base
from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.database.models.user import User


class FaceEmbedding(Base):
    """
    Stores face embeddings for students and faculty.

    Each user can have multiple face embeddings.
    Our enrollment process stores five embeddings
    for each user.
    """

    __tablename__ = "face_embeddings"

    # ============================================================
    # PRIMARY KEY
    # ============================================================

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    # ============================================================
    # USER RELATIONSHIP
    # ============================================================

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="face_embeddings",
    )

    # ============================================================
    # FACE EMBEDDING
    # ============================================================

    embedding: Mapped[list[float]] = mapped_column(
        Vector(512),
        nullable=False,
    )

    # ============================================================
    # ENROLLMENT PHOTO
    # ============================================================

    photo_number: Mapped[int] = mapped_column(
        nullable=False,
    )

    # ============================================================
    # MODEL INFORMATION
    # ============================================================

    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    detector_backend: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # ============================================================
    # SOURCE IMAGE
    # ============================================================

    image_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # ============================================================
    # AUDIT INFORMATION
    # ============================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
