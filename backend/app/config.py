"""Application settings and environment configuration.

This module centralizes configuration for the FastAPI backend and reads values
from environment variables using Pydantic Settings.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


ENV_FILE_PATH = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
	"""Runtime settings for the backend service.

	Attributes:
		app_name: Human-readable application name shown in API docs.
		app_version: Semantic version of the backend service.
		api_prefix: Prefix added to all REST routers.
		debug: Enables debug mode for development diagnostics.
		mongodb_url: MongoDB connection string.
		mongodb_db_name: MongoDB database name.
		jwt_secret: Secret key used to sign access and refresh tokens.
		jwt_algorithm: JWT signing algorithm.
		access_token_expire_minutes: Access token expiration in minutes.
		refresh_token_expire_days: Refresh token expiration in days.
		groq_api_key: API key used for Groq LLM and Whisper services.
		frontend_url: Allowed CORS origin for the frontend app.
		audio_model: Transcription model used by the audio pipeline.
		audio_ffmpeg_path: Executable path or command name for ffmpeg.
		audio_max_upload_bytes: Maximum raw upload size for audio payloads.
		audio_max_duration_seconds: Maximum accepted client recording duration.
		audio_conversion_timeout_seconds: Timeout for ffmpeg conversion command.
		audio_provider_timeout_seconds: Timeout for transcription provider calls.
	"""

	app_name: str = "AI Interview Platform"
	app_version: str = "0.1.0"
	api_prefix: str = "/api"
	debug: bool = True

	mongodb_url: str = "mongodb://localhost:27017"
	mongodb_db_name: str = "interview_platform"

	jwt_secret: str = "change-me-in-production"
	jwt_algorithm: str = "HS256"
	access_token_expire_minutes: int = 15
	refresh_token_expire_days: int = 7
	groq_api_key: str = ""

	frontend_url: str = "http://localhost:5173"
	audio_model: str = "whisper-large-v3-turbo"
	audio_ffmpeg_path: str = "ffmpeg"
	audio_max_upload_bytes: int = Field(default=8_000_000, gt=0)
	audio_max_duration_seconds: int = Field(default=300, gt=0)
	audio_conversion_timeout_seconds: int = Field(default=20, gt=0)
	audio_provider_timeout_seconds: int = Field(default=30, gt=0)
	audio_allowed_mime_types: str = (
		"audio/webm,audio/webm;codecs=opus,audio/wav,audio/x-wav,audio/mpeg,audio/mp4,audio/ogg"
	)

	model_config = SettingsConfigDict(
		env_file=str(ENV_FILE_PATH),
		env_file_encoding="utf-8",
		case_sensitive=False,
		extra="ignore",
	)


settings = Settings()
