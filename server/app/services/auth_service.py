import os
from datetime import datetime, timedelta, timezone

from app.database.models.user import User, UserRole
from app.schemas.auth import AuthenticatedUser, LoginResponse
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import HTTPException, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# ------------------------------------------------------------------
# JWT Configuration
# ------------------------------------------------------------------


def get_jwt_secret_key() -> str:
    """
    Get the JWT secret key from environment variables.
    """

    secret_key = os.getenv("JWT_SECRET_KEY")

    if secret_key is None:
        raise RuntimeError("JWT_SECRET_KEY is not set in the .env file")

    return secret_key


JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256",
)

JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
        "30",
    )
)


# ------------------------------------------------------------------
# Password Hashing
# ------------------------------------------------------------------

password_hasher = PasswordHasher()


# ------------------------------------------------------------------
# JWT
# ------------------------------------------------------------------


def create_access_token(user: User) -> str:
    """
    Create a JWT access token for an authenticated user.
    """

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
    )

    payload = {
        "sub": str(user.id),
        "login_id": user.login_id,
        "email": user.email,
        "role": user.role.value,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        get_jwt_secret_key(),
        algorithm=JWT_ALGORITHM,
    )


# ------------------------------------------------------------------
# Login
# ------------------------------------------------------------------


async def login_user(
    db: AsyncSession,
    login_id: str,
    password: str,
    role: UserRole,
) -> LoginResponse:
    """
    Authenticate a user using login ID, password,
    and selected role.

    The role supplied by the frontend is verified against
    the role stored in the database.
    """

    # --------------------------------------------------------------
    # Find user by login ID
    # --------------------------------------------------------------

    result = await db.execute(
        select(User).where(
            User.login_id == login_id,
        )
    )

    user = result.scalar_one_or_none()

    # --------------------------------------------------------------
    # Invalid login ID
    # --------------------------------------------------------------

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid login ID, password, or role",
        )

    # --------------------------------------------------------------
    # Verify selected role
    # --------------------------------------------------------------

    if user.role != role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid login ID, password, or role",
        )

    # --------------------------------------------------------------
    # Check account status
    # --------------------------------------------------------------

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # --------------------------------------------------------------
    # Verify password using Argon2
    # --------------------------------------------------------------

    try:
        password_hasher.verify(
            user.password_hash,
            password,
        )

    except (
        VerificationError,
        InvalidHashError,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid login ID, password, or role",
        ) from None

    # --------------------------------------------------------------
    # Update last login time
    # --------------------------------------------------------------

    user.last_login_at = datetime.now(timezone.utc)

    await db.commit()

    # --------------------------------------------------------------
    # Create JWT access token
    # --------------------------------------------------------------

    access_token = create_access_token(user)

    # --------------------------------------------------------------
    # Create safe authenticated-user response
    # --------------------------------------------------------------

    authenticated_user = AuthenticatedUser.model_validate(user)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=authenticated_user,
    )
