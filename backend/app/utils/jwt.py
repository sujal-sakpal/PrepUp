"""JWT utility functions for access and refresh token lifecycle."""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from app.config import settings


def _create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
	"""Create a signed JWT token for a specific user and token type.

	Args:
		subject: User identifier stored in the token subject claim.
		token_type: Token purpose, expected values are "access" or "refresh".
		expires_delta: Relative time until token expiration.

	Returns:
		Encoded JWT token string.
	"""
	now = datetime.now(timezone.utc)
	expire_at = now + expires_delta

	payload: dict[str, Any] = {
		"sub": subject,
		"type": token_type,
		"iat": int(now.timestamp()),
		"exp": int(expire_at.timestamp()),
	}

	return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: str) -> str:
	"""Create a short-lived access token for authenticated API calls."""
	return _create_token(
		subject=user_id,
		token_type="access",
		expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
	)


def create_refresh_token(user_id: str) -> str:
	"""Create a long-lived refresh token used to mint new access tokens."""
	return _create_token(
		subject=user_id,
		token_type="refresh",
		expires_delta=timedelta(days=settings.refresh_token_expire_days),
	)


def decode_token(token: str) -> dict[str, Any] | None:
	"""Decode a JWT token and return payload if valid, otherwise None."""
	try:
		payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
		return payload
	except JWTError:
		return None


def decode_access_token(token: str) -> dict[str, Any] | None:
	"""Decode and validate an access token payload."""
	payload = decode_token(token)
	if payload is None:
		return None

	if payload.get("type") != "access":
		return None

	return payload


def decode_refresh_token(token: str) -> dict[str, Any] | None:
	"""Decode and validate a refresh token payload."""
	payload = decode_token(token)
	if payload is None:
		return None

	if payload.get("type") != "refresh":
		return None

	return payload
