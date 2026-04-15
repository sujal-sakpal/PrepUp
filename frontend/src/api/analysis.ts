import { AxiosError } from 'axios'

import { apiClient } from '@/api/client'
import type {
	TranscriptionErrorResponse,
	TranscriptionRequestInput,
	TranscriptionResponse,
} from '@/types/analysis.types'
import type {
	AnswerEvaluation,
	FinalAnalysis,
	NextQuestionRequest,
	NextQuestionResponse,
	QuestionGenerationRequest,
	QuestionGenerationResponse,
} from '@/types/llm.types'

/**
 * Upload a recorded browser audio blob for backend validation and transcription.
 */
export async function createTranscription(
	input: TranscriptionRequestInput,
): Promise<TranscriptionResponse> {
	const formData = new FormData()

	if (input.audioBlob) {
		formData.append('audio_file', input.audioBlob, 'recording.webm')
	}

	if (input.captureError) {
		formData.append('capture_error', input.captureError)
	}

	if (input.sessionId) {
		formData.append('session_id', input.sessionId)
	}

	if (typeof input.questionIndex === 'number') {
		formData.append('question_index', String(input.questionIndex))
	}

	if (input.questionText) {
		formData.append('question_text', input.questionText)
	}

	if (input.questionType) {
		formData.append('question_type', input.questionType)
	}

	if (typeof input.recordedDurationMs === 'number') {
		formData.append('recorded_duration_ms', String(input.recordedDurationMs))
	}

	try {
		const response = await apiClient.post<TranscriptionResponse>(
			'/analysis/transcriptions',
			formData,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			},
		)
		return response.data
	} catch (error) {
		const typedError = error as AxiosError<TranscriptionErrorResponse>
		if (typedError.response?.data) {
			throw typedError.response.data
		}
		throw error
	}
}

/**
 * LLM-based analysis API endpoints
 */
export const llmApi = {
	generateOpeningQuestions: async (
		payload: QuestionGenerationRequest,
	): Promise<QuestionGenerationResponse> => {
		const { data } = await apiClient.post<QuestionGenerationResponse>(
			'/analysis/questions/generate',
			payload,
		)
		return data
	},

	generateNextQuestion: async (
		payload: NextQuestionRequest,
	): Promise<NextQuestionResponse> => {
		const { data } = await apiClient.post<NextQuestionResponse>(
			'/analysis/questions/next',
			payload,
		)
		return data
	},

	evaluateAnswer: async (
		question: string,
		answer: string,
		role: string,
		domain: string,
		interviewType?: string,
	): Promise<AnswerEvaluation> => {
		const { data } = await apiClient.post<AnswerEvaluation>('/analysis/evaluate', null, {
			params: {
				question,
				answer,
				role,
				domain,
				interview_type: interviewType || 'technical',
			},
		})
		return data
	},

	persistEvaluation: async (
		sessionId: string,
		questionIndex: number,
		evaluation: AnswerEvaluation,
	): Promise<void> => {
		await apiClient.post('/analysis/evaluations', {
			session_id: sessionId,
			question_index: questionIndex,
			evaluation,
		})
	},

	generateFinalAnalysis: async (sessionId: string): Promise<FinalAnalysis> => {
		const { data } = await apiClient.post<FinalAnalysis>('/analysis/analysis/final', null, {
			params: { session_id: sessionId },
		})
		return data
	},
} as const

