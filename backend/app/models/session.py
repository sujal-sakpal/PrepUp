"""Pydantic models for interview session configuration and API payloads."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SessionStatus = Literal["configured", "in_progress", "completed", "abandoned"]
InterviewType = Literal["technical", "behavioral", "mixed", "case_study"]
DifficultyLevel = Literal["easy", "medium", "hard", "adaptive"]


class AnswerEvaluation(BaseModel):
	"""Evaluation metrics for a single answer."""

	score: float = Field(..., ge=0.0, le=1.0)
	strengths: list[str] = Field(default_factory=list)
	weaknesses: list[str] = Field(default_factory=list)
	feedback: str = Field(default="")
	keywords_mentioned: list[str] = Field(default_factory=list)
	keywords_missed: list[str] = Field(default_factory=list)


class SessionQAPair(BaseModel):
	"""Persisted question-answer pair with evaluation."""

	question_index: int = Field(..., ge=0)
	question: str | None = None
	question_type: Literal["opening", "followup", "closing"] = Field(default="opening")
	transcription: str = Field(..., min_length=1)
	recorded_duration_seconds: float | None = Field(default=None, ge=0)
	evaluation: AnswerEvaluation | None = Field(default=None)
	created_at: datetime


class InterviewConfig(BaseModel):
	"""Configuration snapshot used to initialize an interview session."""

	domain: str = Field(..., min_length=2, max_length=100)
	role: str = Field(..., min_length=2, max_length=100)
	interview_type: InterviewType
	difficulty: DifficultyLevel
	question_count: int = Field(..., ge=3, le=30)
	focus_areas: list[str] = Field(default_factory=list)
	language: str = Field(default="en", min_length=2, max_length=20)


class CategoryScores(BaseModel):
	"""Category-wise scoring breakdown."""

	technical_accuracy: float = Field(default=0.0, ge=0.0, le=1.0)
	communication: float = Field(default=0.0, ge=0.0, le=1.0)
	problem_solving: float = Field(default=0.0, ge=0.0, le=1.0)
	depth_of_knowledge: float = Field(default=0.0, ge=0.0, le=1.0)
	confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class FinalAnalysis(BaseModel):
	"""Comprehensive analysis of the entire interview."""

	overall_score: float = Field(default=0.0, ge=0.0, le=1.0)
	category_scores: CategoryScores = Field(default_factory=CategoryScores)
	top_strengths: list[str] = Field(default_factory=list)
	improvement_areas: list[str] = Field(default_factory=list)
	detailed_feedback: str = Field(default="")
	recommended_resources: list[str] = Field(default_factory=list)
	hire_recommendation: str = Field(default="maybe")


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
	qa_pairs: list[SessionQAPair] = Field(default_factory=list)
	final_analysis: FinalAnalysis | None = Field(default=None)
	created_at: datetime
	updated_at: datetime


class SessionListResponse(BaseModel):
	"""Paginated response for listing the authenticated user's sessions."""

	items: list[SessionResponse]
	total: int
	skip: int
	limit: int
