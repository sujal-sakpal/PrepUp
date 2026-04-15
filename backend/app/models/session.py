"""Pydantic models for interview session configuration and API payloads."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SessionStatus = Literal["configured", "in_progress", "completed", "abandoned"]
InterviewType = Literal["technical", "behavioral", "mixed", "case_study"]
DifficultyLevel = Literal["easy", "medium", "hard", "adaptive"]


class InterviewConfig(BaseModel):
	"""Configuration snapshot used to initialize an interview session."""

	domain: str = Field(..., min_length=2, max_length=100)
	role: str = Field(..., min_length=2, max_length=100)
	interview_type: InterviewType
	difficulty: DifficultyLevel
	question_count: int = Field(..., ge=3, le=30)
	focus_areas: list[str] = Field(default_factory=list)
	language: str = Field(default="en", min_length=2, max_length=20)


class SessionCreateRequest(BaseModel):
	"""Request payload to create a configured interview session."""

	config: InterviewConfig


class SessionResponse(BaseModel):
	"""Primary session response model returned by session APIs."""

	id: str
	user_id: str
	status: SessionStatus
	config: InterviewConfig
	started_at: datetime | None = None
	ended_at: datetime | None = None
	duration_seconds: int = 0
	created_at: datetime
	updated_at: datetime


class SessionListResponse(BaseModel):
	"""Paginated response for listing the authenticated user's sessions."""

	items: list[SessionResponse]
	total: int
	skip: int
	limit: int
