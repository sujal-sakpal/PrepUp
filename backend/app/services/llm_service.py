"""LLM service for question generation, evaluation, and analysis using Groq."""

import json
import logging
from typing import Any

from groq import Groq

from app.config import settings
from app.models.analysis import (
	AnswerEvaluation,
	CategoryScores,
	FinalAnalysis,
	NextQuestionResponse,
	QuestionGenerationResponse,
)

logger = logging.getLogger(__name__)


class LLMService:
	"""Service for LLM-based interview operations using Groq API."""

	def __init__(self) -> None:
		"""Initialize Groq client with API key from settings."""
		if not settings.groq_api_key:
			raise ValueError("GROQ_API_KEY environment variable is not set")
		self.client = Groq(api_key=settings.groq_api_key)
		self.model = "llama-3.3-70b-versatile"

	@staticmethod
	def _question_style_rules(interview_type: str) -> str:
		"""Return strict rules that keep generated questions aligned to interview type."""
		if interview_type == "behavioral":
			return (
				"Interview style: behavioral only. Ask scenario-based STAR questions (Situation, Task, Action, Result).\n"
				"Do NOT ask technical implementation/design/coding questions.\n"
				"Focus on teamwork, conflict handling, leadership, ownership, communication, prioritization."
			)

		if interview_type == "case_study":
			return (
				"Interview style: case-study only. Ask structured business/problem-solving case questions.\n"
				"Use hypothesis-driven framing, trade-offs, metrics, and recommendation steps.\n"
				"Do NOT ask direct coding trivia questions."
			)

		if interview_type == "mixed":
			return (
				"Interview style: mixed. Blend one practical technical angle with one behavioral/decision angle in the flow.\n"
				"Avoid pure trivia; prefer realistic role-relevant situations."
			)

		return (
			"Interview style: technical only. Ask role-relevant technical questions about architecture, problem-solving,"
			" trade-offs, debugging, and execution depth."
		)

	async def generate_opening_questions(
		self,
		domain: str,
		role: str,
		interview_type: str,
		difficulty: str,
		focus_areas: list[str] | None = None,
		language: str = "en",
	) -> list[str]:
		"""Generate the first 3 opening questions for an interview session.

		Args:
			domain: Interview domain (e.g., "technology", "finance")
			role: Job role (e.g., "Backend Engineer")
			interview_type: Type of interview (e.g., "technical", "behavioral")
			difficulty: Difficulty level (e.g., "medium")
			focus_areas: List of focus areas to emphasize
			language: Language for questions (default "en")

		Returns:
			List of exactly 3 opening questions
		"""
		focus_str = ", ".join(focus_areas) if focus_areas else "general knowledge"
		style_rules = self._question_style_rules(interview_type)

		prompt = f"""You are an expert interviewer. Generate exactly 3 opening questions for a {difficulty} {interview_type} interview.

Context:
- Domain: {domain}
- Role: {role}
- Focus Areas: {focus_str}
- Language: {language}

Rules:
{style_rules}
- The FIRST question MUST ask for a brief introduction and the candidate's most relevant past experience.
- The first question must explicitly cover both: (a) self-introduction and (b) past experience relevant to the role/domain.
- Questions 2 and 3 should naturally build from that background and prioritize core concepts for the role plus the user-selected focus areas.
- If focus areas are provided, ensure at least one of questions 2 or 3 directly targets one focus area.
- Keep questions concise and conversational.
- Do not include numbering in the question text.

Respond with ONLY a valid JSON object with a "questions" array of exactly 3 strings. No other text.

Example format:
{{"questions": ["Question 1?", "Question 2?", "Question 3?"]}}"""

		return await self._call_groq_json(
			prompt,
			response_model=QuestionGenerationResponse,
		)

	async def generate_next_question(
		self,
		domain: str,
		role: str,
		interview_type: str,
		current_score: float,
		questions_remaining: int,
		focus_areas: list[str] | None = None,
		conversation_summary: str = "",
	) -> str:
		"""Generate the next question dynamically based on performance.

		Args:
			domain: Interview domain
			role: Job role
			interview_type: Type of interview
			current_score: Running score (0.0-1.0) from previous answers
			questions_remaining: How many questions left to ask
			conversation_summary: Brief summary of conversation so far

		Returns:
			The next question as a string
		"""
		difficulty_hint = "easier" if current_score < 0.5 else "moderate" if current_score < 0.75 else "harder"
		style_rules = self._question_style_rules(interview_type)
		focus_str = ", ".join(focus_areas) if focus_areas else "none specified"

		prompt = f"""You are an expert interviewer conducting a {interview_type} interview.

Context:
- Domain: {domain}
- Role: {role}
- Current Performance Score: {current_score:.2f}/1.0
- Suggested Difficulty: {difficulty_hint}
- Questions Remaining: {questions_remaining}
- User Focus Areas: {focus_str}

Conversation Summary:
{conversation_summary if conversation_summary else "(First question)"}

Generate the next interview question. The question should:
1. Be appropriate for the role and domain
2. Adjust difficulty based on current performance
3. Build on the conversation naturally
4. Focus on core concepts for the role and prioritize user-selected focus areas when provided
5. Start with a short acknowledgment of the candidate's previous answer to make the conversation feel natural
6. If Questions Remaining is 1, the question MUST be a closing question that wraps up the interview.

Rules:
{style_rules}
- Output a single string in "question" that contains:
  a) one short acknowledgment sentence tied to the previous answer,
  b) then one follow-up interview question.
- If Questions Remaining is 1, the follow-up must be closing-oriented, such as asking for final thoughts, a summary of strengths, or any questions the candidate has.
- Keep total output to at most 2 sentences.
- Do not use bullet points, numbering, or labels.

Respond with ONLY a valid JSON object with a "question" field. No other text.

Example format:
{{"question": "Thanks for explaining your API scaling work. How would you design idempotent retry handling for payment failures in a distributed system?"}}"""

		response = await self._call_groq_json(
			prompt,
			response_model=NextQuestionResponse,
		)
		return response

	async def evaluate_answer(
		self,
		question: str,
		answer: str,
		role: str,
		domain: str,
		interview_type: str = "technical",
	) -> AnswerEvaluation:
		"""Evaluate a user's answer to an interview question.

		Args:
			question: The question asked
			answer: The user's transcribed answer
			role: Job role
			domain: Interview domain
			interview_type: Type of interview

		Returns:
			AnswerEvaluation object with score, feedback, etc.
		"""
		prompt = f"""You are an expert {domain} interviewer evaluating a {interview_type} interview answer.

Question: {question}

Candidate's Answer: {answer}

Job Role: {role}
Domain: {domain}
Interview Type: {interview_type}

Evaluate the answer and respond with ONLY a valid JSON object matching this structure:
{{
	"score": 0.85,
	"strengths": ["strength 1", "strength 2"],
	"weaknesses": ["weakness 1", "weakness 2"],
	"feedback": "Detailed constructive feedback...",
	"keywords_mentioned": ["keyword1", "keyword2"],
	"keywords_missed": ["keyword3", "keyword4"]
}}

Guidelines:
- score: 0.0-1.0 rating of the answer quality
- strengths: List 2-3 key strengths (max 5 total)
- weaknesses: List 2-3 areas to improve (max 5 total)
- feedback: 2-3 sentences of constructive feedback
- keywords: Domain-specific technical keywords

Respond with ONLY the JSON object. No other text."""

		return await self._call_groq_json(
			prompt,
			response_model=AnswerEvaluation,
		)

	async def generate_final_analysis(
		self,
		domain: str,
		role: str,
		interview_type: str,
		qa_pairs: list[dict[str, Any]],
		all_scores: list[float],
	) -> FinalAnalysis:
		"""Generate comprehensive final analysis after interview completion.

		Args:
			domain: Interview domain
			role: Job role
			interview_type: Type of interview
			qa_pairs: List of QA pair dicts with questions, answers, evaluations
			all_scores: List of individual answer scores

		Returns:
			FinalAnalysis object with overall insights
		"""
		qa_summary = "\n".join(
			[
				f"Q{i}: {pair.get('question', 'N/A')}\nA: {pair.get('transcription', 'N/A')[:200]}...\nScore: {pair.get('evaluation', {}).get('score', 0):.2f}"
				for i, pair in enumerate(qa_pairs, 1)
			]
		)

		overall_score = sum(all_scores) / len(all_scores) if all_scores else 0.5
		hire_score_mapping = {
			(0.8, 1.0): "strong_hire",
			(0.65, 0.8): "hire",
			(0.45, 0.65): "maybe",
			(0.0, 0.45): "no_hire",
		}
		hire_recommendation = next(
			(rec for (low, high), rec in hire_score_mapping.items() if low <= overall_score < high),
			"maybe",
		)

		prompt = f"""You are an expert hiring manager evaluating a {interview_type} interview for a {role} position in {domain}.

Overall Performance Score: {overall_score:.2f}/1.0

Q&A Summary:
{qa_summary}

Generate a comprehensive hiring decision and feedback. Respond with ONLY a valid JSON object:
{{
	"overall_score": {overall_score:.2f},
	"category_scores": {{
		"technical_accuracy": 0.80,
		"communication": 0.75,
		"problem_solving": 0.85,
		"depth_of_knowledge": 0.70,
		"confidence": 0.78
	}},
	"top_strengths": ["strength 1", "strength 2", "strength 3"],
	"improvement_areas": ["area 1", "area 2", "area 3"],
	"detailed_feedback": "Comprehensive feedback about the interview performance...",
	"recommended_resources": ["resource 1", "resource 2"],
	"hire_recommendation": "{hire_recommendation}"
}}

Guidelines:
- Category scores should be 0.0-1.0 and based on interview performance
- List 3-5 strengths and improvement areas
- Provide actionable, specific feedback
- Include resources for improvement areas
- hire_recommendation must be one of: strong_hire, hire, maybe, no_hire

Respond with ONLY the JSON object. No other text."""

		return await self._call_groq_json(
			prompt,
			response_model=FinalAnalysis,
		)

	async def _call_groq_json(
		self,
		prompt: str,
		response_model: type,
	) -> Any:
		"""Call Groq API with JSON mode and parse response.

		Args:
			prompt: The prompt to send to the model
			response_model: The Pydantic model to use for validation

		Returns:
			Parsed response object of type response_model
		"""
		try:
			response = self.client.chat.completions.create(
				model=self.model,
				messages=[{"role": "user", "content": prompt}],
				temperature=0.2,
				max_tokens=2048,
				response_format={"type": "json_object"},
			)

			response_text = response.choices[0].message.content.strip()

			# Try to extract JSON from the response
			try:
				# First, try direct JSON parsing
				data = json.loads(response_text)
			except json.JSONDecodeError:
				# If that fails, try to find JSON in the response
				import re

				json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
				if json_match:
					data = json.loads(json_match.group())
				else:
					raise ValueError(f"No valid JSON found in response: {response_text}")

			# Handle different response types
			if response_model == QuestionGenerationResponse:
				return data.get("questions", [])
			elif response_model == NextQuestionResponse:
				return data.get("question", "")
			elif response_model == AnswerEvaluation:
				return AnswerEvaluation(**data)
			elif response_model == FinalAnalysis:
				# Guard against partial JSON responses by filling required fields.
				category_scores = data.get("category_scores") or {}
				data["category_scores"] = {
					"technical_accuracy": float(category_scores.get("technical_accuracy", 0.5)),
					"communication": float(category_scores.get("communication", 0.5)),
					"problem_solving": float(category_scores.get("problem_solving", 0.5)),
					"depth_of_knowledge": float(category_scores.get("depth_of_knowledge", 0.5)),
					"confidence": float(category_scores.get("confidence", 0.5)),
				}
				data["overall_score"] = float(data.get("overall_score", 0.5))
				data["top_strengths"] = list(data.get("top_strengths") or ["Good effort shown"])
				data["improvement_areas"] = list(data.get("improvement_areas") or ["Add more technical depth"])
				data["detailed_feedback"] = str(
					data.get("detailed_feedback")
					or "The interview was completed successfully. Continue practicing for stronger performance."
				)
				data["recommended_resources"] = list(data.get("recommended_resources") or [])
				hire_recommendation = data.get("hire_recommendation")
				if not isinstance(hire_recommendation, str) or hire_recommendation not in {
					"strong_hire",
					"hire",
					"maybe",
					"no_hire",
				}:
					data["hire_recommendation"] = "maybe"
				return FinalAnalysis(**data)
			else:
				return response_model(**data)

		except Exception as exc:
			logger.error(f"Error calling Groq API: {exc}", exc_info=True)
			raise
