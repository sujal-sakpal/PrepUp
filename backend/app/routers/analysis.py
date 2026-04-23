"""Analysis routes including Phase 3 audio ingestion for transcription."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile, status
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_db
from app.models.analysis import (
	AnswerEvaluation,
	AudioNormalizationMetadata,
	FinalAnalysis,
	NextQuestionRequest,
	NextQuestionResponse,
	PersistEvaluationRequest,
	QuestionGenerationRequest,
	QuestionGenerationResponse,
	TranscriptionErrorDetail,
	TranscriptionErrorResponse,
	TranscriptionResponse,
)
from app.models.user import UserResponse
from app.services.audio_service import AudioProcessingError, AudioService
from app.services.llm_service import LLMService
from app.services.session_service import SessionService

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post(
	"/transcriptions",
	response_model=TranscriptionResponse,
	status_code=status.HTTP_202_ACCEPTED,
)
async def transcribe_audio(
	audio_file: UploadFile | None = File(default=None),
	session_id: str | None = Form(default=None),
	question_index: int | None = Form(default=None, ge=0),
	question_text: str | None = Form(default=None),
	question_type: str = Form(default="opening"),
	recorded_duration_ms: int | None = Form(default=None, ge=1),
	capture_error: str | None = Form(default=None),
	current_user: UserResponse = Depends(get_current_user),
	db: AsyncIOMotorDatabase = Depends(get_db),
) -> TranscriptionResponse | JSONResponse:
	"""Validate, normalize, and transcribe uploaded browser audio."""

	request_id = str(uuid4())
	audio_service = AudioService()

	if capture_error == "permission_denied":
		error_payload = TranscriptionErrorResponse(
			request_id=request_id,
			error=TranscriptionErrorDetail(
				code="MIC_PERMISSION_DENIED",
				message="Microphone permission was denied by the user agent.",
				retryable=False,
			),
		)
		return JSONResponse(
			status_code=status.HTTP_400_BAD_REQUEST,
			content=error_payload.model_dump(),
		)

	if audio_file is None:
		error_payload = TranscriptionErrorResponse(
			request_id=request_id,
			error=TranscriptionErrorDetail(
				code="INVALID_AUDIO_BYTES",
				message="No audio file was provided in the request.",
				retryable=True,
			),
		)
		return JSONResponse(
			status_code=status.HTTP_400_BAD_REQUEST,
			content=error_payload.model_dump(),
		)

	mime_type = audio_file.content_type or "application/octet-stream"

	try:
		audio_bytes = await audio_file.read()
		audio_service.ensure_audio_payload_is_valid(
			audio_bytes=audio_bytes,
			mime_type=mime_type,
			recorded_duration_ms=recorded_duration_ms,
		)
		normalized_audio = audio_service.normalize_to_wav(
			audio_bytes=audio_bytes,
			mime_type=mime_type,
		)
		transcription_result = await audio_service.transcribe_wav_with_groq(
			normalized_audio.wav_bytes
		)

		stored_question_index = None
		if session_id is not None:
			session_service = SessionService(db)
			stored_question_index = await session_service.upsert_transcript_answer(
				user_id=current_user.id,
				session_id=session_id,
				question_index=question_index,
				transcription=transcription_result.transcript_text,
				question_text=question_text,
				question_type=question_type,
				recorded_duration_seconds=normalized_audio.duration_seconds,
			)

		audio_metadata = AudioNormalizationMetadata(
			original_mime_type=mime_type,
			original_size_bytes=normalized_audio.original_size_bytes,
			normalized_size_bytes=normalized_audio.normalized_size_bytes,
			duration_seconds=normalized_audio.duration_seconds,
			conversion_latency_ms=normalized_audio.conversion_latency_ms,
		)
		return TranscriptionResponse(
			request_id=request_id,
			status="transcribed",
			session_id=session_id,
			question_index=stored_question_index,
			transcript_text=transcription_result.transcript_text,
			provider=transcription_result.provider,
			provider_latency_ms=transcription_result.provider_latency_ms,
			audio=audio_metadata,
			warnings=[],
		)
	except AudioProcessingError as exc:
		status_code = _status_code_for_error(exc.code)
		error_payload = TranscriptionErrorResponse(
			request_id=request_id,
			error=TranscriptionErrorDetail(
				code=exc.code,
				message=str(exc),
				retryable=exc.retryable,
				details=exc.details,
			),
		)
		return JSONResponse(status_code=status_code, content=error_payload.model_dump())
	finally:
		if audio_file is not None:
			await audio_file.close()


def _status_code_for_error(error_code: str) -> int:
	"""Map known audio pipeline errors to HTTP status codes."""
	if error_code in {"INVALID_AUDIO_BYTES", "INVALID_AUDIO_TYPE", "INVALID_AUDIO_DURATION"}:
		return status.HTTP_400_BAD_REQUEST
	if error_code == "INVALID_AUDIO_SIZE":
		return status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
	if error_code in {"AUDIO_CONVERSION_TIMEOUT", "TRANSCRIPTION_TIMEOUT"}:
		return status.HTTP_504_GATEWAY_TIMEOUT
	if error_code == "TRANSCRIPTION_PROVIDER_FAILURE":
		return status.HTTP_502_BAD_GATEWAY
	return status.HTTP_422_UNPROCESSABLE_ENTITY


@router.post("/questions/generate", response_model=QuestionGenerationResponse)
async def generate_opening_questions(
	payload: QuestionGenerationRequest,
	current_user: UserResponse = Depends(get_current_user),
) -> QuestionGenerationResponse:
	"""Generate opening questions for a new interview session."""
	try:
		llm_service = LLMService()
		questions = await llm_service.generate_opening_questions(
			domain=payload.domain,
			role=payload.role,
			interview_type=payload.interview_type,
			difficulty=payload.difficulty,
			focus_areas=payload.focus_areas,
			language=payload.language,
		)
		return QuestionGenerationResponse(questions=questions)
	except Exception as exc:
		return JSONResponse(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			content={"error": f"Failed to generate questions: {str(exc)}"},
		)


@router.post("/questions/next", response_model=NextQuestionResponse)
async def generate_next_question(
	payload: NextQuestionRequest,
	current_user: UserResponse = Depends(get_current_user),
) -> NextQuestionResponse:
	"""Generate the next interview question dynamically."""
	try:
		llm_service = LLMService()
		question = await llm_service.generate_next_question(
			domain=payload.domain,
			role=payload.role,
			interview_type=payload.interview_type,
			current_score=payload.current_score,
			questions_remaining=payload.questions_remaining,
			focus_areas=payload.focus_areas,
			conversation_summary=payload.conversation_summary,
		)
		return NextQuestionResponse(question=question)
	except Exception as exc:
		return JSONResponse(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			content={"error": f"Failed to generate next question: {str(exc)}"},
		)


@router.post("/evaluate", response_model=AnswerEvaluation)
async def evaluate_answer(
	question: str,
	answer: str,
	role: str,
	domain: str,
	interview_type: str = "technical",
	current_user: UserResponse = Depends(get_current_user),
) -> AnswerEvaluation | JSONResponse:
	"""Evaluate a user's answer to an interview question."""
	try:
		llm_service = LLMService()
		evaluation = await llm_service.evaluate_answer(
			question=question,
			answer=answer,
			role=role,
			domain=domain,
			interview_type=interview_type,
		)
		return evaluation
	except Exception as exc:
		return JSONResponse(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			content={"error": f"Failed to evaluate answer: {str(exc)}"},
		)


@router.post(
	"/evaluations",
	status_code=status.HTTP_204_NO_CONTENT,
	response_model=None,
	response_class=Response,
)
async def persist_evaluation(
	payload: PersistEvaluationRequest,
	current_user: UserResponse = Depends(get_current_user),
	db: AsyncIOMotorDatabase = Depends(get_db),
) -> Response:
	"""Persist an LLM evaluation for a specific session question."""
	service = SessionService(db)
	await service.update_qa_pair_evaluation(
		user_id=current_user.id,
		session_id=payload.session_id,
		question_index=payload.question_index,
		evaluation=payload.evaluation.model_dump(),
	)
	return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/analysis/final", response_model=FinalAnalysis)
async def generate_final_analysis(
	session_id: str,
	current_user: UserResponse = Depends(get_current_user),
	db: AsyncIOMotorDatabase = Depends(get_db),
) -> FinalAnalysis | JSONResponse:
	"""Generate final analysis for a completed interview session."""
	try:
		session_service = SessionService(db)
		session = await session_service.get_session_by_id(current_user.id, session_id)

		llm_service = LLMService()
		qa_list = [
			{
				"question": pair.question or "N/A",
				"transcription": pair.transcription,
				"evaluation": pair.evaluation.model_dump() if pair.evaluation else {},
			}
			for pair in session.qa_pairs
		]
		all_scores = [
			pair.evaluation.score for pair in session.qa_pairs if pair.evaluation
		]

		final_analysis = await llm_service.generate_final_analysis(
			domain=session.config.domain,
			role=session.config.role,
			interview_type=session.config.interview_type,
			qa_pairs=qa_list,
			all_scores=all_scores,
		)

		# Update session with final analysis
		await session_service.set_final_analysis(
			current_user.id, session_id, final_analysis
		)

		return final_analysis
	except Exception as exc:
		return JSONResponse(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			content={"error": f"Failed to generate final analysis: {str(exc)}"},
		)
