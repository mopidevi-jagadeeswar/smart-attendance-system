from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base

# ============================================================
# NOTICE CATEGORY
# ============================================================


class NoticeCategory(str, Enum):
    """Categories supported by the notice system."""

    GENERAL = "general"
    ACADEMIC = "academic"
    ATTENDANCE = "attendance"
    EXAM = "exam"
    EVENT = "event"
    HOLIDAY = "holiday"
    IMPORTANT = "important"


# ============================================================
# NOTICE PRIORITY
# ============================================================


class NoticePriority(str, Enum):
    """Priority levels supported by the notice system."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


# ============================================================
# NOTICE MODEL
# ============================================================


class Notice(Base):
    """
    Database model for college notices and announcements.

    Public users can read published notices.

    Admin users can:
    - Create notices
    - Edit notices
    - Delete notices
    - Publish or unpublish notices
    - Set priority
    - Set an expiry date
    """

    __tablename__ = "notices"

    # ========================================================
    # PRIMARY KEY
    # ========================================================

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    # ========================================================
    # NOTICE CONTENT
    # ========================================================

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # ========================================================
    # NOTICE CATEGORY
    # ========================================================

    category: Mapped[NoticeCategory] = mapped_column(
        SQLEnum(
            NoticeCategory,
            name="notice_category",
        ),
        nullable=False,
        default=NoticeCategory.GENERAL,
        index=True,
    )

    # ========================================================
    # NOTICE PRIORITY
    # ========================================================

    priority: Mapped[NoticePriority] = mapped_column(
        SQLEnum(
            NoticePriority,
            name="notice_priority",
        ),
        nullable=False,
        default=NoticePriority.NORMAL,
        index=True,
    )

    # ========================================================
    # PUBLICATION STATUS
    # ========================================================

    is_published: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    # ========================================================
    # PUBLICATION DATE
    # ========================================================

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ========================================================
    # EXPIRY DATE
    # ========================================================

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    # ========================================================
    # AUDIT INFORMATION
    # ========================================================

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
