"""Authentication routes for account registration and JWT lifecycle."""

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_db
from app.models.user import (
	RefreshTokenRequest,
	TokenResponse,
	UserCreate,
	UserLogin,
	UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
	payload: UserCreate,
	db: AsyncIOMotorDatabase = Depends(get_db),
) -> UserResponse:
	"""Register a new user account using email and password credentials."""
	auth_service = AuthService(db)
	return await auth_service.register_user(payload)


@router.post("/login", response_model=TokenResponse)
async def login_user(
	payload: UserLogin,
	db: AsyncIOMotorDatabase = Depends(get_db),
) -> TokenResponse:
	"""Authenticate a user and issue access and refresh JWT tokens."""
	auth_service = AuthService(db)
	return await auth_service.authenticate_user(payload)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
	payload: RefreshTokenRequest,
	db: AsyncIOMotorDatabase = Depends(get_db),
) -> TokenResponse:
	"""Rotate and return a new access and refresh token pair."""
	auth_service = AuthService(db)
	return await auth_service.refresh_tokens(payload.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
	"""Return the authenticated user's profile from the access token."""
	return current_user
