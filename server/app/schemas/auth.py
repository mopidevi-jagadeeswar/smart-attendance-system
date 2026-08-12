from uuid import UUID

from app.database.models.user import UserRole
from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    """
    Data required when a user logs into the application.
    """

    login_id: str = Field(
        min_length=1,
        max_length=50,
    )

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    role: UserRole


class TokenResponse(BaseModel):
    """
    JWT token returned after successful authentication.
    """

    access_token: str
    token_type: str = "bearer"


class AuthenticatedUser(BaseModel):
    """
    Basic information about the currently authenticated user.
    """

    id: UUID
    login_id: str
    full_name: str | None = None
    email: str
    role: UserRole
    is_active: bool
    is_verified: bool

    model_config = ConfigDict(
        from_attributes=True,
    )


class LoginResponse(BaseModel):
    """
    Complete response returned after successful login.
    """

    access_token: str
    token_type: str = "bearer"
    user: AuthenticatedUser
