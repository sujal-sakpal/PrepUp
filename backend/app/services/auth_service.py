"""Business logic for user authentication and JWT token issuance."""

from datetime import datetime, timezone

import bcrypt
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.exceptions import ConflictError, UnauthorizedError
from app.models.user import TokenResponse, UserCreate, UserInDB, UserLogin, UserResponse
from app.utils.jwt import create_access_token, create_refresh_token, decode_refresh_token


class AuthService:
	"""Encapsulates registration, authentication, and token refresh flows."""

	def __init__(self, db: AsyncIOMotorDatabase) -> None:
		"""Initialize service with the injected MongoDB database instance."""
		self.db = db
		self.collection = db.users

	async def register_user(self, payload: UserCreate) -> UserResponse:
		"""Create a new user account and return a public user response.

		Args:
			payload: Registration request with email, password, and full name.

		Returns:
			UserResponse for the created account.

		Raises:
			ConflictError: If a user with the same email already exists.
		"""
		existing_user = await self.collection.find_one({"email": payload.email.lower()})
		if existing_user is not None:
			raise ConflictError("A user with this email already exists")

		now = datetime.now(timezone.utc)
		password_hash = self._hash_password(payload.password)

		user_doc = {
			"email": payload.email.lower(),
			"full_name": payload.full_name,
			"password_hash": password_hash,
			"created_at": now,
			"updated_at": now,
		}

		result = await self.collection.insert_one(user_doc)
		user_doc["_id"] = result.inserted_id

		return self._to_user_response(user_doc)

	async def authenticate_user(self, payload: UserLogin) -> TokenResponse:
		"""Validate credentials and return access/refresh tokens.

		Args:
			payload: Login request with email and plain-text password.

		Returns:
			TokenResponse containing fresh access and refresh tokens.

		Raises:
			UnauthorizedError: If credentials are invalid.
		"""
		user_document = await self.collection.find_one({"email": payload.email.lower()})
		if user_document is None:
			raise UnauthorizedError("Invalid email or password")

		user = self._to_user_in_db(user_document)

		if not self._verify_password(payload.password, user.password_hash):
			raise UnauthorizedError("Invalid email or password")

		return self._build_token_response(user.id)

	async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
		"""Exchange a valid refresh token for a new access/refresh token pair.

		Args:
			refresh_token: Signed refresh JWT issued during login/refresh.

		Returns:
			TokenResponse containing a rotated token pair.

		Raises:
			UnauthorizedError: If the refresh token is invalid or user is missing.
		"""
		payload = decode_refresh_token(refresh_token)
		if payload is None:
			raise UnauthorizedError("Invalid or expired refresh token")

		user_id = payload.get("sub")
		if not isinstance(user_id, str):
			raise UnauthorizedError("Invalid refresh token payload")

		user = await self.get_user_in_db_by_id(user_id)
		if user is None:
			raise UnauthorizedError("User not found for refresh token")

		return self._build_token_response(user.id)

	async def get_user_by_id(self, user_id: str) -> UserResponse | None:
		"""Fetch a user by ID and return the public user shape if found."""
		user = await self.get_user_in_db_by_id(user_id)
		if user is None:
			return None
		return UserResponse(
			id=user.id,
			email=user.email,
			full_name=user.full_name,
			created_at=user.created_at,
			updated_at=user.updated_at,
		)

	async def get_user_in_db_by_id(self, user_id: str) -> UserInDB | None:
		"""Fetch a user by ID and return the full internal user model."""
		try:
			object_id = ObjectId(user_id)
		except Exception:
			return None

		user_document = await self.collection.find_one({"_id": object_id})
		if user_document is None:
			return None

		return self._to_user_in_db(user_document)

	@staticmethod
	def _hash_password(password: str) -> str:
		"""Hash plain-text password using bcrypt."""
		hashed_bytes = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
		return hashed_bytes.decode("utf-8")

	@staticmethod
	def _verify_password(password: str, password_hash: str) -> bool:
		"""Verify a plain-text password against a bcrypt hash."""
		return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))

	@staticmethod
	def _to_user_response(user_document: dict) -> UserResponse:
		"""Convert MongoDB user document to UserResponse model."""
		return UserResponse(
			id=str(user_document["_id"]),
			email=user_document["email"],
			full_name=user_document["full_name"],
			created_at=user_document["created_at"],
			updated_at=user_document["updated_at"],
		)

	@staticmethod
	def _to_user_in_db(user_document: dict) -> UserInDB:
		"""Convert MongoDB user document to UserInDB model."""
		return UserInDB(
			id=str(user_document["_id"]),
			email=user_document["email"],
			full_name=user_document["full_name"],
			created_at=user_document["created_at"],
			updated_at=user_document["updated_at"],
			password_hash=user_document["password_hash"],
		)

	@staticmethod
	def _build_token_response(user_id: str) -> TokenResponse:
		"""Build token response for a given user identifier."""
		access_token = create_access_token(user_id)
		refresh_token = create_refresh_token(user_id)

		return TokenResponse(
			access_token=access_token,
			refresh_token=refresh_token,
			token_type="bearer",
		)
