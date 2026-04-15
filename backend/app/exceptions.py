"""Custom exception hierarchy for application-level errors."""


class AppError(Exception):
	"""Base exception for all business and application errors.

	Attributes:
		status_code: HTTP status code returned by the API layer.
	"""

	def __init__(self, message: str, status_code: int = 500) -> None:
		super().__init__(message)
		self.status_code = status_code


class UnauthorizedError(AppError):
	"""Raised when authentication or authorization fails."""

	def __init__(self, detail: str = "Unauthorized") -> None:
		super().__init__(detail, status_code=401)


class ConflictError(AppError):
	"""Raised when a resource already exists and cannot be recreated."""

	def __init__(self, detail: str) -> None:
		super().__init__(detail, status_code=409)


class NotFoundError(AppError):
	"""Raised when a requested resource does not exist."""

	def __init__(self, resource_name: str) -> None:
		super().__init__(f"{resource_name} not found", status_code=404)
