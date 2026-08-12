import os
from collections.abc import Callable
from typing import Annotated

from app.database.models.user import User, UserRole
from app.database.session import get_db
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


# ------------------------------------------------------------------
# JWT Configuration
# ------------------------------------------------------------------


def get_jwt_secret_key() -> str:
    """
    Get the JWT secret key from environment variables.
    """

    secret_key = os.getenv("JWT_SECRET_KEY")

    if secret_key is None:
        raise RuntimeError(
            "JWT_SECRET_KEY is not set in the .env file",
        )

    return secret_key


JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256",
)


# ------------------------------------------------------------------
# HTTP Bearer Authentication
# ------------------------------------------------------------------

security = HTTPBearer()


# ------------------------------------------------------------------
# Get Current User
# ------------------------------------------------------------------


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials,
        Depends(security),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
) -> User:
    """
    Validate the JWT access token and return
    the authenticated user with role profile loaded.
    """

    token = credentials.credentials

    # --------------------------------------------------------------
    # Decode JWT
    # --------------------------------------------------------------

    try:
        payload = jwt.decode(
            token,
            get_jwt_secret_key(),
            algorithms=[JWT_ALGORITHM],
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        ) from None

    # --------------------------------------------------------------
    # Get user ID from JWT subject
    # --------------------------------------------------------------

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # --------------------------------------------------------------
    # Find user and eagerly load role profile
    # --------------------------------------------------------------

    result = await db.execute(
        select(User)
        .options(
            selectinload(User.admin),
            selectinload(User.faculty),
            selectinload(User.student),
        )
        .where(
            User.id == user_id,
        )
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # --------------------------------------------------------------
    # Check account status
    # --------------------------------------------------------------

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


# ------------------------------------------------------------------
# Role Authorization
# ------------------------------------------------------------------


def require_role(
    required_role: UserRole,
) -> Callable:
    """
    Create a dependency that requires a specific user role.
    """

    async def role_checker(
        current_user: Annotated[
            User,
            Depends(get_current_user),
        ],
    ) -> User:

        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )

        return current_user

    return role_checker
