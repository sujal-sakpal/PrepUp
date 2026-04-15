"""FastAPI dependency providers used across routers."""

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from app.exceptions import UnauthorizedError
from app.models.user import UserResponse
from app.services.auth_service import AuthService
from app.utils.jwt import decode_access_token

security = HTTPBearer(auto_error=False)


async def get_db() -> AsyncIOMotorDatabase:
	"""Provide the active MongoDB database instance to route handlers."""
	return get_database()


async def get_current_user(
	credentials: HTTPAuthorizationCredentials | None = Depends(security),
	db: AsyncIOMotorDatabase = Depends(get_db),
) -> UserResponse:
	"""Resolve and return the currently authenticated user.

	Args:
		credentials: Bearer token extracted from the Authorization header.
		db: Injected MongoDB database connection.

	Returns:
		Public user model for the authenticated principal.

	Raises:
		UnauthorizedError: If token is missing, invalid, expired, or user is missing.
	"""
	if credentials is None:
		raise UnauthorizedError("Missing Authorization header")

	payload = decode_access_token(credentials.credentials)
	if payload is None:
		raise UnauthorizedError("Invalid or expired access token")

	user_id = payload.get("sub")
	if not isinstance(user_id, str):
		raise UnauthorizedError("Invalid access token payload")

	auth_service = AuthService(db)
	user = await auth_service.get_user_by_id(user_id)
	if user is None:
		raise UnauthorizedError("User not found")

	return user
