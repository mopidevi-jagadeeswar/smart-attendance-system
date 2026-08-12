from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from app.database.base import Base
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.database.models.user import User


class Admin(Base):
    """
    Database model for administrator profiles.

    Authentication information such as login ID, password,
    role, and account status is stored in the users table.
    This table stores admin-specific profile information.
    """

    __tablename__ = "admins"

    # ------------------------------------------------------------------
    # Primary Key
    # ------------------------------------------------------------------

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    # ------------------------------------------------------------------
    # User Relationship
    # ------------------------------------------------------------------

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="admin",
    )

    # ------------------------------------------------------------------
    # Admin Information
    # ------------------------------------------------------------------

    admin_id: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    designation: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    # ------------------------------------------------------------------
    # Account Status
    # ------------------------------------------------------------------

    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
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
