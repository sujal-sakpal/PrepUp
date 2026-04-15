"""Pydantic models for users and authentication payloads."""

from datetime import datetime

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
	"""Request model for user registration."""

	email: str = Field(..., min_length=3, max_length=320)
	password: str = Field(..., min_length=8, max_length=128)
	full_name: str = Field(..., min_length=1, max_length=100)


class UserLogin(BaseModel):
	"""Request model for email/password authentication."""

	email: str = Field(..., min_length=3, max_length=320)
	password: str = Field(..., min_length=8, max_length=128)


class RefreshTokenRequest(BaseModel):
	"""Request model used to exchange refresh token for new tokens."""

	refresh_token: str = Field(..., min_length=10)


class TokenResponse(BaseModel):
	"""Authentication response containing access and refresh JWT tokens."""

	access_token: str
	refresh_token: str
	token_type: str = "bearer"


class UserResponse(BaseModel):
	"""Safe user model returned by API endpoints."""

	id: str
	email: str
	full_name: str
	created_at: datetime
	updated_at: datetime


class UserInDB(UserResponse):
	"""Database model that includes internal-only security fields."""

	password_hash: str
