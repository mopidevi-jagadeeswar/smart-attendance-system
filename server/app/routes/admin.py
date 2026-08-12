from typing import Annotated

from argon2 import PasswordHasher
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models.user import User, UserRole
from app.database.session import get_db
from app.dependencies.auth import require_role


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


password_hasher = PasswordHasher()


# ============================================================
# REQUEST SCHEMAS
# ============================================================


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserRoleUpdate(BaseModel):
    role: UserRole


class PasswordResetRequest(BaseModel):
    new_password: str


# ============================================================
# ADMIN AUTHENTICATION
# ============================================================


@router.get("/me")
async def get_my_profile(
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
) -> dict[str, str]:
    """
    Return the currently authenticated
    administrator's basic information.
    """

    return {
        "message": "Admin authentication successful",
        "login_id": current_user.login_id,
        "role": current_user.role.value,
    }


# ============================================================
# GET ALL USERS
# ============================================================


@router.get("/users")
async def get_users(
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> list[dict]:
    """
    Return all users with their profile information.

    Student and faculty profile photos are included.

    Password hashes are never returned.
    """

    # --------------------------------------------------------
    # Load users together with their role profiles.
    # --------------------------------------------------------

    result = await db.execute(
        select(User)
        .options(
            selectinload(User.student),
            selectinload(User.faculty),
            selectinload(User.admin),
        )
        .order_by(
            User.created_at.desc(),
        ),
    )

    users = result.scalars().all()

    response: list[dict] = []

    # --------------------------------------------------------
    # Build response
    # --------------------------------------------------------

    for user in users:
        full_name: str | None = None
        photo_url: str | None = None

        # ====================================================
        # STUDENT
        # ====================================================

        if user.role == UserRole.STUDENT:
            student = user.student

            if student is not None:
                full_name = student.full_name
                photo_url = student.photo_url

        # ====================================================
        # FACULTY
        # ====================================================

        elif user.role == UserRole.FACULTY:
            faculty = user.faculty

            if faculty is not None:
                # Use the faculty model's actual attributes
                # if they exist.
                full_name = getattr(
                    faculty,
                    "full_name",
                    None,
                )

                photo_url = getattr(
                    faculty,
                    "photo_url",
                    None,
                )

                # Fallback in case your Faculty model
                # uses a different name field.
                if full_name is None:
                    full_name = getattr(
                        faculty,
                        "name",
                        None,
                    )

        # ====================================================
        # ADMIN
        # ====================================================

        elif user.role == UserRole.ADMIN:
            full_name = user.login_id
            photo_url = None

        # ====================================================
        # FINAL RESPONSE
        # ====================================================

        response.append(
            {
                "id": str(user.id),
                "login_id": user.login_id,
                "email": user.email,
                "role": user.role.value,
                "full_name": full_name,
                "photo_url": photo_url,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "created_at": (
                    user.created_at.isoformat() if user.created_at else None
                ),
            },
        )

    return response


# ============================================================
# GET SINGLE USER
# ============================================================


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict:
    """
    Return a single user's information.
    """

    result = await db.execute(
        select(User)
        .options(
            selectinload(User.student),
            selectinload(User.faculty),
            selectinload(User.admin),
        )
        .where(
            User.id == user_id,
        ),
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    full_name: str | None = None
    photo_url: str | None = None

    # --------------------------------------------------------
    # Student
    # --------------------------------------------------------

    if user.role == UserRole.STUDENT:
        student = user.student

        if student is not None:
            full_name = student.full_name
            photo_url = student.photo_url

    # --------------------------------------------------------
    # Faculty
    # --------------------------------------------------------

    elif user.role == UserRole.FACULTY:
        faculty = user.faculty

        if faculty is not None:
            full_name = getattr(
                faculty,
                "full_name",
                None,
            )

            photo_url = getattr(
                faculty,
                "photo_url",
                None,
            )

            if full_name is None:
                full_name = getattr(
                    faculty,
                    "name",
                    None,
                )

    # --------------------------------------------------------
    # Admin
    # --------------------------------------------------------

    elif user.role == UserRole.ADMIN:
        full_name = user.login_id
        photo_url = None

    return {
        "id": str(user.id),
        "login_id": user.login_id,
        "email": user.email,
        "role": user.role.value,
        "full_name": full_name,
        "photo_url": photo_url,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": (user.created_at.isoformat() if user.created_at else None),
    }


# ============================================================
# ACTIVATE / DEACTIVATE USER
# ============================================================


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    data: UserStatusUpdate,
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict:
    """
    Activate or deactivate a user account.
    """

    result = await db.execute(
        select(User).where(
            User.id == user_id,
        ),
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # --------------------------------------------------------
    # Prevent admin from disabling themselves.
    # --------------------------------------------------------

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=("You cannot change your own account status"),
        )

    user.is_active = data.is_active

    await db.commit()

    await db.refresh(user)

    return {
        "message": (
            "User activated successfully"
            if user.is_active
            else "User deactivated successfully"
        ),
        "user": {
            "id": str(user.id),
            "login_id": user.login_id,
            "is_active": user.is_active,
        },
    }


# ============================================================
# CHANGE USER ROLE
# ============================================================


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    data: UserRoleUpdate,
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict:
    """
    Change a user's role.
    """

    result = await db.execute(
        select(User).where(
            User.id == user_id,
        ),
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # --------------------------------------------------------
    # Prevent admin from changing their own role.
    # --------------------------------------------------------

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )

    user.role = data.role

    await db.commit()

    await db.refresh(user)

    return {
        "message": "User role updated successfully",
        "user": {
            "id": str(user.id),
            "login_id": user.login_id,
            "role": user.role.value,
        },
    }


# ============================================================
# RESET PASSWORD
# ============================================================


@router.post(
    "/users/{user_id}/reset-password",
)
async def reset_user_password(
    user_id: str,
    data: PasswordResetRequest,
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict[str, str]:
    """
    Reset a user's password.

    The password is hashed before being stored.
    """

    # --------------------------------------------------------
    # Validate password
    # --------------------------------------------------------

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=("Password must contain at least 8 characters"),
        )

    # --------------------------------------------------------
    # Find user
    # --------------------------------------------------------

    result = await db.execute(
        select(User).where(
            User.id == user_id,
        ),
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # --------------------------------------------------------
    # Hash password
    # --------------------------------------------------------

    user.password_hash = password_hasher.hash(
        data.new_password,
    )

    await db.commit()

    return {
        "message": "User password reset successfully",
    }


# ============================================================
# DELETE USER
# ============================================================


@router.delete(
    "/users/{user_id}",
)
async def delete_user(
    user_id: str,
    current_user: Annotated[
        User,
        Depends(
            require_role(
                UserRole.ADMIN,
            ),
        ),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> dict[str, str]:
    """
    Permanently delete a user account.

    An administrator cannot delete their own account.
    """

    # --------------------------------------------------------
    # Find user
    # --------------------------------------------------------

    result = await db.execute(
        select(User).where(
            User.id == user_id,
        ),
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # --------------------------------------------------------
    # Prevent self deletion
    # --------------------------------------------------------

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    # --------------------------------------------------------
    # Delete user
    # --------------------------------------------------------

    await db.delete(user)

    await db.commit()

    return {
        "message": "User deleted successfully",
    }
