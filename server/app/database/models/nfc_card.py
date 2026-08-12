from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from app.database.base import Base
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.database.models.student import Student


class NFCCard(Base):
    """
    Database model for NFC cards assigned to students.

    Each NFC card belongs to one student and can be used
    to verify attendance.
    """

    __tablename__ = "nfc_cards"

    # ------------------------------------------------------------------
    # Primary Key
    # ------------------------------------------------------------------

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    # ------------------------------------------------------------------
    # Student Relationship
    # ------------------------------------------------------------------

    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    student: Mapped["Student"] = relationship(
        "Student",
        back_populates="nfc_cards",
    )

    # ------------------------------------------------------------------
    # NFC Information
    # ------------------------------------------------------------------

    card_uid: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    # ------------------------------------------------------------------
    # Card Status
    # ------------------------------------------------------------------

    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )

    # ------------------------------------------------------------------
    # NFC Usage Information
    # ------------------------------------------------------------------

    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Audit Information
    # ------------------------------------------------------------------

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
