import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { createTranscription, llmApi } from '@/api/analysis'
import { sessionsApi } from '@/api/sessions'
import { WaveformVisualizer } from '@/components/interview/WaveformVisualizer'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import type { SessionResponse, SessionQAPair } from '@/types/session.types'
import type { TranscriptionErrorResponse, TranscriptionResponse } from '@/types/analysis.types'

type RecorderUiState = 'idle' | 'recording' | 'processing' | 'done' | 'failed'
type QuestionType = 'opening' | 'followup' | 'closing'

function summarizeConversation(entries: SessionQAPair[]): string {
	if (entries.length === 0) {
		return ''
	}

	return entries
		.map((entry, idx) => {
			const questionText = entry.question ?? `Question ${idx + 1}`
			return `Q${idx + 1}: ${questionText}\nA${idx + 1}: ${entry.transcription}`
		})
		.join('\n\n')
}

function formatElapsedTime(elapsedMs: number): string {
	const totalSeconds = Math.floor(elapsedMs / 1000)
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getFriendlyErrorMessage(errorResponse: TranscriptionErrorResponse | null): string {
	if (!errorResponse) {
		return 'Transcription failed. Please try again.'
	}

	const errorCode = errorResponse.error.code
	if (errorCode === 'MIC_PERMISSION_DENIED') {
		return 'Microphone permission is required. Allow microphone access and retry.'
	}
	if (errorCode === 'INVALID_AUDIO_SIZE') {
		return 'Recording is too large. Keep the answer shorter and retry.'
	}
	if (errorCode === 'INVALID_AUDIO_DURATION') {
		return 'Recording exceeded duration limit. Please record a shorter answer.'
	}
	if (errorCode === 'AUDIO_CONVERSION_FAILED') {
		return 'Audio format could not be processed. Please record again.'
	}
	if (errorCode === 'TRANSCRIPTION_TIMEOUT' || errorCode === 'AUDIO_CONVERSION_TIMEOUT') {
		return 'The service took too long. Retry in a moment.'
	}
	if (errorCode === 'TRANSCRIPTION_PROVIDER_FAILURE') {
		return 'Transcription provider is currently unavailable. Please retry.'
	}

	return errorResponse.error.message
}

/**
 * Interview room scaffold for Phase 3 routing.
 */
export default function InterviewRoomPage() {
	const { sessionId } = useParams<{ sessionId: string }>()
	const {
		isRecording,
		elapsedMs,
		waveformData,
		error: recorderError,
		startRecording,
		stopRecording,
		resetRecording,
	} = useAudioRecorder()
	const [uiState, setUiState] = useState<RecorderUiState>('idle')
	const [transcriptResponse, setTranscriptResponse] = useState<TranscriptionResponse | null>(null)
	const [apiError, setApiError] = useState<TranscriptionErrorResponse | null>(null)
	const [sessionData, setSessionData] = useState<SessionResponse | null>(null)
	const [sessionTranscripts, setSessionTranscripts] = useState<SessionQAPair[]>([])
	const [isSessionLoading, setIsSessionLoading] = useState(false)
	const [isQuestionLoading, setIsQuestionLoading] = useState(false)
	const [currentQuestion, setCurrentQuestion] = useState<string | null>(null)
	const [currentQuestionType, setCurrentQuestionType] = useState<QuestionType>('opening')

	const hasSessionId = Boolean(sessionId)
	const completedQuestions = sessionTranscripts.length
	const configuredQuestionCount = sessionData?.config.question_count ?? null
	const isQuestionLimitReached =
		configuredQuestionCount !== null && completedQuestions >= configuredQuestionCount
	const displayQuestionNumber = isQuestionLimitReached
		? configuredQuestionCount
		: completedQuestions + 1
	const questionIndex = Math.max(displayQuestionNumber - 1, 0)
	const progressDenominator =
		configuredQuestionCount !== null && configuredQuestionCount > 0
			? configuredQuestionCount
			: Math.max(completedQuestions, 1)
	const progressPercent = Math.min((completedQuestions / progressDenominator) * 100, 100)

	const canStartRecording = useMemo(
		() => !isRecording && uiState !== 'processing' && !isQuestionLimitReached && !isQuestionLoading,
		[isQuestionLimitReached, isQuestionLoading, isRecording, uiState],
	)

	useEffect(() => {
		if (!sessionId) {
			setSessionData(null)
			setSessionTranscripts([])
			setCurrentQuestion(null)
			return
		}

		let isActive = true
		const loadSession = async () => {
			setIsSessionLoading(true)
			try {
				const session = await sessionsApi.getSessionById(sessionId)
				if (isActive) {
					setSessionData(session)
					setSessionTranscripts(session.qa_pairs ?? [])
				}
			} finally {
				if (isActive) {
					setIsSessionLoading(false)
				}
			}
		}

		void loadSession()

		return () => {
			isActive = false
		}
	}, [sessionId])

	useEffect(() => {
		if (!sessionData || isSessionLoading) {
			return
		}

		if (isQuestionLimitReached) {
			setCurrentQuestion(null)
			return
		}

		if (currentQuestion) {
			return
		}

		let active = true

		const prepareQuestion = async () => {
			setIsQuestionLoading(true)
			try {
				if (sessionTranscripts.length === 0) {
					const opening = await llmApi.generateOpeningQuestions({
						domain: sessionData.config.domain,
						role: sessionData.config.role,
						interview_type: sessionData.config.interview_type,
						difficulty: sessionData.config.difficulty,
						focus_areas: sessionData.config.focus_areas,
						language: sessionData.config.language,
					})
					if (active) {
						setCurrentQuestion(opening.questions[0] ?? null)
						setCurrentQuestionType('opening')
					}
					return
				}

				const availableScores = sessionTranscripts
					.map((pair) => pair.evaluation?.score)
					.filter((score): score is number => typeof score === 'number')
				const avgScore =
					availableScores.length > 0
						? availableScores.reduce((sum, score) => sum + score, 0) / availableScores.length
						: 0.5

				const nextQuestion = await llmApi.generateNextQuestion({
					domain: sessionData.config.domain,
					role: sessionData.config.role,
					interview_type: sessionData.config.interview_type,
					current_score: avgScore,
					questions_remaining: Math.max(
						(sessionData.config.question_count ?? 1) - sessionTranscripts.length,
						1,
					),
					conversation_summary: summarizeConversation(sessionTranscripts),
				})

				if (active) {
					setCurrentQuestion(nextQuestion.question)
					setCurrentQuestionType('followup')
				}
			} finally {
				if (active) {
					setIsQuestionLoading(false)
				}
			}
		}

		void prepareQuestion()

		return () => {
			active = false
		}
	}, [currentQuestion, isQuestionLimitReached, isSessionLoading, sessionData, sessionTranscripts])

	const handleStartRecording = async () => {
		if (!canStartRecording || !currentQuestion) {
			return
		}

		setApiError(null)
		setTranscriptResponse(null)
		setUiState('recording')
		await startRecording()
	}

	const handleStopAndTranscribe = async () => {
		if (isQuestionLimitReached) {
			return
		}

		setApiError(null)
		setUiState('processing')

		const blob = await stopRecording()
		if (!blob) {
			setUiState('failed')
			return
		}

		try {
			const response = await createTranscription({
				audioBlob: blob,
				sessionId,
				questionIndex,
				questionText: currentQuestion ?? undefined,
				questionType: currentQuestionType,
				recordedDurationMs: elapsedMs,
			})
			setTranscriptResponse(response)

			if (sessionId && typeof response.question_index === 'number' && response.transcript_text) {
				const evaluation = await llmApi.evaluateAnswer(
					currentQuestion ?? `Question #${response.question_index + 1}`,
					response.transcript_text,
					sessionData?.config.role ?? 'Unknown Role',
					sessionData?.config.domain ?? 'general',
					sessionData?.config.interview_type,
				)

				await llmApi.persistEvaluation(sessionId, response.question_index, evaluation)

				const updatedSession = await sessionsApi.getSessionById(sessionId)
				setSessionData(updatedSession)
				setSessionTranscripts(updatedSession.qa_pairs ?? [])

				const remaining = Math.max(updatedSession.config.question_count - updatedSession.qa_pairs.length, 0)
				if (remaining > 0) {
					const availableScores = updatedSession.qa_pairs
						.map((pair) => pair.evaluation?.score)
						.filter((score): score is number => typeof score === 'number')
					const avgScore =
						availableScores.length > 0
							? availableScores.reduce((sum, score) => sum + score, 0) / availableScores.length
							: 0.5

					const nextQuestion = await llmApi.generateNextQuestion({
						domain: updatedSession.config.domain,
						role: updatedSession.config.role,
						interview_type: updatedSession.config.interview_type,
						current_score: avgScore,
						questions_remaining: remaining,
						conversation_summary: summarizeConversation(updatedSession.qa_pairs),
					})

					setCurrentQuestion(nextQuestion.question)
					setCurrentQuestionType(remaining === 1 ? 'closing' : 'followup')
				} else {
					await llmApi.generateFinalAnalysis(sessionId)
					const completedSession = await sessionsApi.getSessionById(sessionId)
					setSessionData(completedSession)
					setSessionTranscripts(completedSession.qa_pairs ?? [])
					setCurrentQuestion(null)
				}
			}
			setUiState('done')
		} catch (error) {
			const typedError = error as TranscriptionErrorResponse
			setApiError(typedError)
			setUiState('failed')
		}
	}

	const handleRetry = () => {
		resetRecording()
		setApiError(null)
		setTranscriptResponse(null)
		setUiState('idle')
	}

	const recorderErrorMessage = recorderError
		? recorderError.code === 'permission_denied'
			? 'Microphone permission denied. Please allow access in browser settings.'
			: recorderError.message
		: null

	const effectiveErrorMessage = recorderErrorMessage || getFriendlyErrorMessage(apiError)

	return (
		<main className="page page-dashboard">
			<section className="dashboard-card interview-card">
				<p className="eyebrow">Interview Room</p>
				<h1>AI Mock Interview</h1>
				<p className="hero-copy">
					Question appears first, then record your response. AI evaluates and asks the next question.
				</p>

				<div className="interview-meta-row">
					<span className="meta-pill">Session: {hasSessionId ? sessionId : 'missing'}</span>
					<span className="meta-pill">Question #{displayQuestionNumber}</span>
					<span className="meta-pill">Elapsed: {formatElapsedTime(elapsedMs)}</span>
					<span className={`meta-pill state-${uiState}`}>State: {uiState}</span>
				</div>

				<div className="session-progress-panel">
					<div className="session-progress-head">
						<strong>Progress</strong>
						<span>
							Completed {completedQuestions} / {progressDenominator} questions
						</span>
					</div>
					<div className="session-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={progressDenominator} aria-valuenow={completedQuestions}>
						<div className="session-progress-fill" style={{ width: `${progressPercent}%` }} />
					</div>
					{isQuestionLimitReached && (
						<p className="session-progress-note">All configured questions are completed for this session.</p>
					)}
				</div>

				<div className="question-panel">
					<h2>Current Question</h2>
					{isQuestionLoading ? (
						<p className="hero-copy">Generating your next question...</p>
					) : currentQuestion ? (
						<p className="question-text">{currentQuestion}</p>
					) : (
						<p className="hero-copy">Interview complete. You can view your analysis from the dashboard.</p>
					)}
				</div>

				<WaveformVisualizer
					values={waveformData}
					isRecording={isRecording}
					isProcessing={uiState === 'processing'}
				/>

				{uiState === 'processing' && (
					<p className="server-error">Processing audio and generating transcript...</p>
				)}

				{uiState === 'failed' && <p className="server-error">{effectiveErrorMessage}</p>}

				{uiState === 'done' && transcriptResponse?.transcript_text && (
					<div className="transcript-panel">
						<h2>Transcript</h2>
						<p>{transcriptResponse.transcript_text}</p>
						<div className="transcript-meta">
							<span>Provider: {transcriptResponse.provider ?? 'unknown'}</span>
							<span>Latency: {transcriptResponse.provider_latency_ms ?? 0} ms</span>
							<span>Audio: {transcriptResponse.audio.duration_seconds}s</span>
						</div>
					</div>
				)}

				<div className="transcript-history-panel">
					<h2>Previous Transcriptions</h2>
					{isSessionLoading ? (
						<p className="hero-copy">Loading transcript history...</p>
					) : sessionTranscripts.length === 0 ? (
						<p className="hero-copy">No saved transcripts yet for this session.</p>
					) : (
						<ul className="transcript-history-list">
							{sessionTranscripts.map((entry, index) => (
								<li
									key={`${entry.question_index}-${entry.created_at}-${index}`}
									className="transcript-history-item"
								>
									<div className="transcript-history-header">
									<strong>Question #{index + 1}</strong>
										<span>{entry.recorded_duration_seconds?.toFixed(2) ?? '0.00'}s</span>
									</div>
									<p>{entry.transcription}</p>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="dashboard-actions">
					<button
						type="button"
						className="btn btn-primary"
						onClick={() => {
							void handleStartRecording()
						}}
						disabled={!canStartRecording || !currentQuestion}
					>
						{isQuestionLimitReached ? 'Session Complete' : 'Start Recording'}
					</button>
					<button
						type="button"
						className="btn btn-ghost"
						onClick={() => {
							void handleStopAndTranscribe()
						}}
						disabled={!isRecording || uiState === 'processing'}
					>
						Stop and Transcribe
					</button>
					<button
						type="button"
						className="btn btn-ghost"
						onClick={handleRetry}
						disabled={uiState === 'processing'}
					>
						Retry
					</button>
					<Link className="btn btn-primary" to="/dashboard">
						Back to Dashboard
					</Link>
				</div>
			</section>
		</main>
	)
}
