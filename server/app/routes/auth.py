from typing import Annotated

from app.database.models.user import User
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.schemas.auth import (
    AuthenticatedUser,
    LoginRequest,
    LoginResponse,
)
from app.services.auth_service import login_user
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),  # noqa: B008
) -> LoginResponse:
    """
    Authenticate a user using login ID, password, and role.
    """

    return await login_user(
        db=db,
        login_id=data.login_id,
        password=data.password,
        role=data.role,
    )


@router.get(
    "/me",
    response_model=AuthenticatedUser,
)
async def get_me(
    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
) -> AuthenticatedUser:
    """
    Return the currently authenticated user's information.
    """

    full_name: str | None = None

    if current_user.role.value == "admin":
        if current_user.admin is not None:
            full_name = current_user.admin.full_name

    elif current_user.role.value == "faculty":
        if current_user.faculty is not None:
            full_name = current_user.faculty.full_name

    elif current_user.role.value == "student":
        if current_user.student is not None:
            full_name = current_user.student.full_name

    return AuthenticatedUser(
        id=current_user.id,
        login_id=current_user.login_id,
        full_name=full_name,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
    )
