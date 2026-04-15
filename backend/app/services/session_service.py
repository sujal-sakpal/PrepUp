"""Business logic for interview session CRUD operations."""

from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.exceptions import NotFoundError
from app.models.session import (
	SessionCreateRequest,
	SessionListResponse,
	SessionResponse,
)


class SessionService:
	"""Service layer for creating and retrieving user interview sessions."""

	def __init__(self, db: AsyncIOMotorDatabase) -> None:
		"""Initialize service with an injected MongoDB database handle."""
		self.collection = db.interview_sessions

	async def create_session(self, user_id: str, payload: SessionCreateRequest) -> SessionResponse:
		"""Create a new configured interview session for the given user."""
		user_object_id = self._to_object_id(user_id)
		now = datetime.now(timezone.utc)

		session_doc = {
			"user_id": user_object_id,
			"status": "configured",
			"config": payload.config.model_dump(),
			"started_at": None,
			"ended_at": None,
			"duration_seconds": 0,
			"qa_pairs": [],
			"created_at": now,
			"updated_at": now,
		}

		result = await self.collection.insert_one(session_doc)
		session_doc["_id"] = result.inserted_id

		return self._to_session_response(session_doc)

	async def list_sessions(self, user_id: str, skip: int = 0, limit: int = 20) -> SessionListResponse:
		"""List sessions for the authenticated user with pagination."""
		user_object_id = self._to_object_id(user_id)
		query = {"user_id": user_object_id}

		cursor = (
			self.collection.find(query)
			.sort("created_at", -1)
			.skip(skip)
			.limit(limit)
		)
		session_docs = await cursor.to_list(length=limit)
		total = await self.collection.count_documents(query)

		return SessionListResponse(
			items=[self._to_session_response(doc) for doc in session_docs],
			total=total,
			skip=skip,
			limit=limit,
		)

	async def get_session_by_id(self, user_id: str, session_id: str) -> SessionResponse:
		"""Return a single session if it exists and belongs to the user."""
		user_object_id = self._to_object_id(user_id)
		session_object_id = self._to_object_id(session_id)

		session_doc = await self.collection.find_one(
			{"_id": session_object_id, "user_id": user_object_id}
		)
		if session_doc is None:
			raise NotFoundError("Session")

		return self._to_session_response(session_doc)

	async def upsert_transcript_answer(
		self,
		user_id: str,
		session_id: str,
		question_index: int | None,
		transcription: str,
		question_text: str | None = None,
		question_type: str = "opening",
		recorded_duration_seconds: float | None = None,
	) -> int:
		"""Persist or update transcript text for a given session/question index.
		
		If question_index is None, auto-calculates it as the current length of qa_pairs.
		Returns the question_index that was stored.
		"""
		user_object_id = self._to_object_id(user_id)
		session_object_id = self._to_object_id(session_id)
		now = datetime.now(timezone.utc)

		session_doc = await self.collection.find_one(
			{"_id": session_object_id, "user_id": user_object_id}
		)
		if session_doc is None:
			raise NotFoundError("Session")

		qa_pairs = list(session_doc.get("qa_pairs", []))
		resolved_question_index = question_index if question_index is not None else len(qa_pairs)
		
		payload = {
			"question_index": resolved_question_index,
			"question": question_text,
			"question_type": question_type,
			"transcription": transcription,
			"recorded_duration_seconds": recorded_duration_seconds,
			"evaluation": None,
			"created_at": now,
		}

		qa_pairs.append(payload)

		await self.collection.update_one(
			{"_id": session_object_id, "user_id": user_object_id},
			{
				"$set": {
					"qa_pairs": qa_pairs,
					"status": "in_progress",
					"started_at": session_doc.get("started_at") or now,
					"updated_at": now,
				}
			},
		)
		return resolved_question_index

	async def delete_session(self, user_id: str, session_id: str) -> None:
		"""Delete an interview session owned by the authenticated user."""
		user_object_id = self._to_object_id(user_id)
		session_object_id = self._to_object_id(session_id)

		result = await self.collection.delete_one(
			{"_id": session_object_id, "user_id": user_object_id}
		)
		if result.deleted_count == 0:
			raise NotFoundError("Session")

	async def set_final_analysis(
		self, user_id: str, session_id: str, final_analysis: dict | object
	) -> None:
		"""Set the final analysis for a completed session."""
		from app.models.session import FinalAnalysis

		user_object_id = self._to_object_id(user_id)
		session_object_id = self._to_object_id(session_id)

		# Convert to dict if it's a Pydantic model
		if hasattr(final_analysis, "model_dump"):
			analysis_dict = final_analysis.model_dump()
		else:
			analysis_dict = final_analysis

		now = datetime.now(timezone.utc)

		await self.collection.update_one(
			{"_id": session_object_id, "user_id": user_object_id},
			{
				"$set": {
					"final_analysis": analysis_dict,
					"status": "completed",
					"ended_at": now,
					"updated_at": now,
				}
			},
		)

	async def update_qa_pair_evaluation(
		self, user_id: str, session_id: str, question_index: int, evaluation: dict
	) -> None:
		"""Update evaluation for a specific Q&A pair."""
		user_object_id = self._to_object_id(user_id)
		session_object_id = self._to_object_id(session_id)
		now = datetime.now(timezone.utc)

		await self.collection.update_one(
			{"_id": session_object_id, "user_id": user_object_id},
			{
				"$set": {
					f"qa_pairs.{question_index}.evaluation": evaluation,
					"updated_at": now,
				}
			},
		)

	@staticmethod
	def _to_object_id(raw_id: str) -> ObjectId:
		"""Convert string IDs into ObjectId, raising NotFound for invalid IDs."""
		try:
			return ObjectId(raw_id)
		except Exception as exc:
			raise NotFoundError("Session") from exc

	@staticmethod
	def _to_session_response(session_doc: dict) -> SessionResponse:
		"""Convert raw Mongo session document into API response model."""
		return SessionResponse(
			id=str(session_doc["_id"]),
			user_id=str(session_doc["user_id"]),
			status=session_doc["status"],
			config=session_doc["config"],
			started_at=session_doc.get("started_at"),
			ended_at=session_doc.get("ended_at"),
			duration_seconds=session_doc.get("duration_seconds", 0),
			qa_pairs=session_doc.get("qa_pairs", []),
			final_analysis=session_doc.get("final_analysis"),
			created_at=session_doc["created_at"],
			updated_at=session_doc["updated_at"],
		)
