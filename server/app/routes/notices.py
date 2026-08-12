from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models.notice import (
    Notice,
    NoticeCategory,
    NoticePriority,
)
from app.database.session import get_db

router = APIRouter(
    tags=["Notices"],
)


# ============================================================
# REQUEST MODELS
# ============================================================


class NoticeCreateRequest(BaseModel):
    """Request model for creating a notice."""

    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
    )

    content: str = Field(
        ...,
        min_length=1,
    )

    category: NoticeCategory = NoticeCategory.GENERAL

    priority: NoticePriority = NoticePriority.NORMAL

    is_published: bool = False

    expires_at: datetime | None = None


class NoticeUpdateRequest(BaseModel):
    """Request model for updating a notice."""

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    content: str | None = Field(
        default=None,
        min_length=1,
    )

    category: NoticeCategory | None = None

    priority: NoticePriority | None = None

    is_published: bool | None = None

    expires_at: datetime | None = None


# ============================================================
# RESPONSE HELPER
# ============================================================


def notice_to_dict(
    notice: Notice,
) -> dict[str, Any]:
    """Convert a Notice model into a JSON-compatible dictionary."""

    return {
        "id": str(notice.id),
        "title": notice.title,
        "content": notice.content,
        "category": notice.category.value,
        "priority": notice.priority.value,
        "is_published": notice.is_published,
        "published_at": (
            notice.published_at.isoformat() if notice.published_at else None
        ),
        "expires_at": (notice.expires_at.isoformat() if notice.expires_at else None),
        "created_at": notice.created_at.isoformat(),
        "updated_at": notice.updated_at.isoformat(),
    }


# ============================================================
# PUBLIC NOTICES
# ============================================================


@router.get(
    "/notices",
    tags=["Public Notices"],
)
async def get_public_notices(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """
    Return currently published and non-expired notices.

    This endpoint is public and read-only.
    """

    now = datetime.now(UTC)

    result = await db.execute(
        select(Notice)
        .where(
            Notice.is_published.is_(True),
            (Notice.expires_at.is_(None) | (Notice.expires_at > now)),
        )
        .order_by(
            Notice.priority.desc(),
            Notice.published_at.desc(),
            Notice.created_at.desc(),
        )
    )

    notices = result.scalars().all()

    return [notice_to_dict(notice) for notice in notices]


# ============================================================
# PUBLIC SINGLE NOTICE
# ============================================================


@router.get(
    "/notices/{notice_id}",
    tags=["Public Notices"],
)
async def get_public_notice(
    notice_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Return one published and non-expired notice.
    """

    now = datetime.now(UTC)

    result = await db.execute(
        select(Notice).where(
            Notice.id == notice_id,
            Notice.is_published.is_(True),
            (Notice.expires_at.is_(None) | (Notice.expires_at > now)),
        )
    )

    notice = result.scalar_one_or_none()

    if notice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notice not found.",
        )

    return notice_to_dict(notice)


# ============================================================
# ADMIN - GET ALL NOTICES
# ============================================================


@router.get(
    "/admin/notices",
    tags=["Admin Notices"],
)
async def get_admin_notices(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """
    Return all notices for the admin panel.

    Includes both published notices and drafts.
    """

    result = await db.execute(
        select(Notice).order_by(
            Notice.created_at.desc(),
        )
    )

    notices = result.scalars().all()

    return [notice_to_dict(notice) for notice in notices]


# ============================================================
# ADMIN - GET SINGLE NOTICE
# ============================================================


@router.get(
    "/admin/notices/{notice_id}",
    tags=["Admin Notices"],
)
async def get_admin_notice(
    notice_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return a single notice for the admin panel."""

    result = await db.execute(
        select(Notice).where(
            Notice.id == notice_id,
        )
    )

    notice = result.scalar_one_or_none()

    if notice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notice not found.",
        )

    return notice_to_dict(notice)


# ============================================================
# ADMIN - CREATE NOTICE
# ============================================================


@router.post(
    "/admin/notices",
    status_code=status.HTTP_201_CREATED,
    tags=["Admin Notices"],
)
async def create_notice(
    payload: NoticeCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Create a new notice."""

    title = payload.title.strip()
    content = payload.content.strip()

    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notice title is required.",
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notice content is required.",
        )

    published_at = datetime.now(UTC) if payload.is_published else None

    notice = Notice(
        title=title,
        content=content,
        category=payload.category,
        priority=payload.priority,
        is_published=payload.is_published,
        published_at=published_at,
        expires_at=payload.expires_at,
    )

    db.add(notice)

    await db.commit()
    await db.refresh(notice)

    return notice_to_dict(notice)


# ============================================================
# ADMIN - UPDATE NOTICE
# ============================================================


@router.put(
    "/admin/notices/{notice_id}",
    tags=["Admin Notices"],
)
async def update_notice(
    notice_id: UUID,
    payload: NoticeUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Update an existing notice."""

    result = await db.execute(
        select(Notice).where(
            Notice.id == notice_id,
        )
    )

    notice = result.scalar_one_or_none()

    if notice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notice not found.",
        )

    if payload.title is not None:
        title = payload.title.strip()

        if not title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Notice title cannot be empty.",
            )

        notice.title = title

    if payload.content is not None:
        content = payload.content.strip()

        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Notice content cannot be empty.",
            )

        notice.content = content

    if payload.category is not None:
        notice.category = payload.category

    if payload.priority is not None:
        notice.priority = payload.priority

    if payload.expires_at is not None:
        notice.expires_at = payload.expires_at

    if payload.is_published is not None:
        was_published = notice.is_published

        notice.is_published = payload.is_published

        if payload.is_published and not was_published:
            notice.published_at = datetime.now(UTC)

        elif not payload.is_published:
            notice.published_at = None

    await db.commit()
    await db.refresh(notice)

    return notice_to_dict(notice)


# ============================================================
# ADMIN - PUBLISH / UNPUBLISH
# ============================================================


@router.patch(
    "/admin/notices/{notice_id}/publish",
    tags=["Admin Notices"],
)
async def toggle_notice_publish(
    notice_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Toggle a notice between published and draft.
    """

    result = await db.execute(
        select(Notice).where(
            Notice.id == notice_id,
        )
    )

    notice = result.scalar_one_or_none()

    if notice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notice not found.",
        )

    notice.is_published = not notice.is_published

    if notice.is_published:
        notice.published_at = datetime.now(UTC)
    else:
        notice.published_at = None

    await db.commit()
    await db.refresh(notice)

    return notice_to_dict(notice)


# ============================================================
# ADMIN - DELETE NOTICE
# ============================================================


@router.delete(
    "/admin/notices/{notice_id}",
    tags=["Admin Notices"],
)
async def delete_notice(
    notice_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Delete a notice."""

    result = await db.execute(
        select(Notice).where(
            Notice.id == notice_id,
        )
    )

    notice = result.scalar_one_or_none()

    if notice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notice not found.",
        )

    await db.delete(notice)
    await db.commit()

    return {
        "success": True,
        "message": "Notice deleted successfully.",
        "id": str(notice_id),
    }
