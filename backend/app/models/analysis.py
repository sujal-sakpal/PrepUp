"""Pydantic models for the audio transcription pipeline contracts."""

from pydantic import BaseModel, Field


TranscriptionStatus = str


class AudioNormalizationMetadata(BaseModel):
	"""Metadata returned after validating and normalizing an uploaded audio file."""

	original_mime_type: str
	original_size_bytes: int = Field(..., ge=0)
	normalized_size_bytes: int = Field(..., ge=0)
	normalized_format: str = "wav"
	sample_rate_hz: int = 16_000
	channels: int = 1
	duration_seconds: float = Field(..., ge=0.0)
	conversion_latency_ms: int = Field(..., ge=0)


class TranscriptionResponse(BaseModel):
	"""Successful API response shape for transcription requests.

	This contract is intentionally stable for frontend integration. During
	Phase 3 Step 4 it returns the normalized audio metadata and keeps
	`transcript_text` empty until the provider call is added in Step 5.
	"""

	request_id: str
	status: str = "audio_normalized"
	session_id: str | None = None
	question_index: int | None = None
	transcript_text: str | None = None
	provider: str | None = None
	provider_latency_ms: int | None = None
	audio: AudioNormalizationMetadata
	warnings: list[str] = Field(default_factory=list)


class TranscriptionErrorDetail(BaseModel):
	"""Standardized error payload for all transcription failures."""

	code: str
	message: str
	retryable: bool = False
	details: dict[str, str | int | float | bool | None] = Field(default_factory=dict)


class TranscriptionErrorResponse(BaseModel):
	"""Error wrapper used by the transcription endpoint."""

	request_id: str
	error: TranscriptionErrorDetail


class AnswerEvaluation(BaseModel):
	"""Evaluation metrics for a single answer."""

	score: float = Field(..., ge=0.0, le=1.0, description="Score from 0.0 to 1.0")
	strengths: list[str] = Field(default_factory=list, description="Key strengths in the answer")
	weaknesses: list[str] = Field(default_factory=list, description="Areas for improvement")
	feedback: str = Field(..., min_length=10, description="Detailed feedback on the answer")
	keywords_mentioned: list[str] = Field(default_factory=list, description="Important keywords used")
	keywords_missed: list[str] = Field(default_factory=list, description="Important keywords not mentioned")


class CategoryScores(BaseModel):
	"""Category-wise scoring breakdown."""

	technical_accuracy: float = Field(..., ge=0.0, le=1.0)
	communication: float = Field(..., ge=0.0, le=1.0)
	problem_solving: float = Field(..., ge=0.0, le=1.0)
	depth_of_knowledge: float = Field(..., ge=0.0, le=1.0)
	confidence: float = Field(..., ge=0.0, le=1.0)


class FinalAnalysis(BaseModel):
	"""Comprehensive analysis of the entire interview."""

	overall_score: float = Field(..., ge=0.0, le=1.0)
	category_scores: CategoryScores
	top_strengths: list[str] = Field(..., min_items=1, max_items=5)
	improvement_areas: list[str] = Field(..., min_items=1, max_items=5)
	detailed_feedback: str = Field(..., min_length=50)
	recommended_resources: list[str] = Field(default_factory=list)
	hire_recommendation: str = Field(
		..., 
		pattern="^(strong_hire|hire|maybe|no_hire)$",
		description="Hiring recommendation based on performance"
	)


class QuestionGenerationRequest(BaseModel):
	"""Request to generate opening questions for a session."""

	domain: str
	role: str
	interview_type: str
	difficulty: str
	focus_areas: list[str] = Field(default_factory=list)
	language: str = Field(default="en")


class QuestionGenerationResponse(BaseModel):
	"""Response with generated opening questions."""

	questions: list[str] = Field(..., min_items=3, max_items=3)


class NextQuestionRequest(BaseModel):
	"""Request to generate the next question dynamically."""

	domain: str
	role: str
	interview_type: str
	current_score: float = Field(..., ge=0.0, le=1.0)
	questions_remaining: int = Field(..., ge=1)
	focus_areas: list[str] = Field(
		default_factory=list,
		description="User-selected focus areas to prioritize in follow-up questions",
	)
	conversation_summary: str = Field(default="", description="Summary of previous answers")


class NextQuestionResponse(BaseModel):
	"""Response with the next question."""

	question: str = Field(..., min_length=10)


class PersistEvaluationRequest(BaseModel):
	"""Request payload to persist an answer evaluation for a session question."""

	session_id: str
	question_index: int = Field(..., ge=0)
	evaluation: AnswerEvaluation
