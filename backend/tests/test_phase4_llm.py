"""Quick test script for Phase 4 LLM service."""

import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / ".."))

from app.services.llm_service import LLMService
from app.config import settings


async def test_llm_service() -> None:
	"""Test all 4 LLM functions."""
	if not settings.groq_api_key:
		print("ERROR: GROQ_API_KEY not set")
		return

	llm = LLMService()
	print("✓ LLM Service initialized\n")

	# Test 1: Generate opening questions
	print("=" * 60)
	print("Test 1: Generate Opening Questions")
	print("=" * 60)
	try:
		questions = await llm.generate_opening_questions(
			domain="technology",
			role="Backend Engineer",
			interview_type="technical",
			difficulty="medium",
			focus_areas=["system design", "databases"],
		)
		print(f"✓ Generated {len(questions)} opening questions:")
		for i, q in enumerate(questions, 1):
			print(f"  {i}. {q}")
	except Exception as e:
		print(f"✗ Error: {e}")
	print()

	# Test 2: Generate next question
	print("=" * 60)
	print("Test 2: Generate Next Question")
	print("=" * 60)
	try:
		next_q = await llm.generate_next_question(
			domain="technology",
			role="Backend Engineer",
			interview_type="technical",
			current_score=0.75,
			questions_remaining=3,
			conversation_summary="Candidate answered well about REST APIs",
		)
		print(f"✓ Generated next question:")
		print(f"  {next_q}")
	except Exception as e:
		print(f"✗ Error: {e}")
	print()

	# Test 3: Evaluate answer
	print("=" * 60)
	print("Test 3: Evaluate Answer")
	print("=" * 60)
	try:
		evaluation = await llm.evaluate_answer(
			question="Tell me about a time you designed a microservice architecture.",
			answer="I designed a notification system that used a message queue and worker processes. We used RabbitMQ for the queue and Python workers to process messages asynchronously. This allowed us to handle 1000+ notifications per second.",
			role="Backend Engineer",
			domain="technology",
			interview_type="technical",
		)
		print(f"✓ Evaluation received:")
		print(f"  Score: {evaluation.score:.2f}")
		print(f"  Strengths: {', '.join(evaluation.strengths)}")
		print(f"  Weaknesses: {', '.join(evaluation.weaknesses)}")
		print(f"  Feedback: {evaluation.feedback}")
		print(f"  Keywords: {', '.join(evaluation.keywords_mentioned)}")
	except Exception as e:
		print(f"✗ Error: {e}")
	print()

	# Test 4: Generate final analysis
	print("=" * 60)
	print("Test 4: Generate Final Analysis")
	print("=" * 60)
	try:
		qa_pairs = [
			{
				"question": "What is REST?",
				"transcription": "REST is a software architectural style that defines a set of constraints for creating web services.",
				"evaluation": {"score": 0.85},
			},
			{
				"question": "Explain databases.",
				"transcription": "Databases store structured data and allow for efficient querying.",
				"evaluation": {"score": 0.75},
			},
		]
		analysis = await llm.generate_final_analysis(
			domain="technology",
			role="Backend Engineer",
			interview_type="technical",
			qa_pairs=qa_pairs,
			all_scores=[0.85, 0.75],
		)
		print(f"✓ Final analysis generated:")
		print(f"  Overall Score: {analysis.overall_score:.2f}")
		print(f"  Hire Recommendation: {analysis.hire_recommendation}")
		print(f"  Strengths: {', '.join(analysis.top_strengths[:2])}")
		print(f"  Improvement Areas: {', '.join(analysis.improvement_areas[:2])}")
	except Exception as e:
		print(f"✗ Error: {e}")
	print()

	print("=" * 60)
	print("✓ Phase 4 tests completed!")
	print("=" * 60)


if __name__ == "__main__":
	asyncio.run(test_llm_service())
