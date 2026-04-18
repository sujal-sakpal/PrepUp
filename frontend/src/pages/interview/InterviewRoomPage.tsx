import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { createTranscription, llmApi } from '@/api/analysis'
import { sessionsApi } from '@/api/sessions'
import { WaveformVisualizer } from '@/components/interview/WaveformVisualizer'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import type { SessionResponse, SessionQAPair } from '@/types/session.types'
import type { TranscriptionErrorResponse, TranscriptionResponse } from '@/types/analysis.types'

import './InterviewRoomPage.css'

type RecorderUiState = 'idle' | 'recording' | 'processing' | 'done' | 'failed'
type QuestionType = 'opening' | 'followup' | 'closing'

type ChatEntry = {
	id: string
	questionIndex: number
	question: string
	answer: string | null
	questionType: QuestionType
	evaluationScore: number | null
	evaluationFeedback: string | null
	durationSeconds: number | null
	isLive: boolean
}

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

function formatQuestionType(questionType: QuestionType): string {
	return questionType.replace('_', ' ')
}

/**
 * Zoom-style interview room for live AI mock interviews.
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
	const [isQuestionSpeaking, setIsQuestionSpeaking] = useState(false)
	const spokenQuestionRef = useRef<string | null>(null)

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
	const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window

	const canStartRecording = useMemo(
		() => !isRecording && uiState !== 'processing' && !isQuestionLimitReached && !isQuestionLoading,
		[isQuestionLimitReached, isQuestionLoading, isRecording, uiState],
	)

	const chatEntries = useMemo<ChatEntry[]>(() => {
		const entries: ChatEntry[] = sessionTranscripts.map((pair, index) => ({
			id: `${pair.question_index}-${pair.created_at}-${index}`,
			questionIndex: pair.question_index + 1,
			question: pair.question ?? `Question ${pair.question_index + 1}`,
			answer: pair.transcription,
			questionType: pair.question_type,
			evaluationScore: pair.evaluation?.score ?? null,
			evaluationFeedback: pair.evaluation?.feedback ?? null,
			durationSeconds: pair.recorded_duration_seconds,
			isLive: false,
		}))

		if (currentQuestion && !isQuestionLimitReached) {
			entries.push({
				id: 'live-question',
				questionIndex: displayQuestionNumber,
				question: currentQuestion,
				answer: null,
				questionType: currentQuestionType,
				evaluationScore: null,
				evaluationFeedback: null,
				durationSeconds: null,
				isLive: true,
			})
		}

		return entries
	}, [
		currentQuestion,
		currentQuestionType,
		displayQuestionNumber,
		isQuestionLimitReached,
		sessionTranscripts,
	])

	const speakCurrentQuestion = useCallback(
		(questionText: string, force = false) => {
			if (
				typeof window === 'undefined' ||
				typeof SpeechSynthesisUtterance === 'undefined' ||
				!window.speechSynthesis
			) {
				setIsQuestionSpeaking(false)
				return
			}

			if (!force && spokenQuestionRef.current === questionText) {
				return
			}

			window.speechSynthesis.cancel()
			const utterance = new SpeechSynthesisUtterance(questionText)
			utterance.lang = sessionData?.config.language || 'en-US'
			utterance.rate = 1.02
			utterance.pitch = 1
			utterance.onstart = () => {
				spokenQuestionRef.current = questionText
				setIsQuestionSpeaking(true)
			}
			utterance.onend = () => {
				setIsQuestionSpeaking(false)
			}
			utterance.onerror = () => {
				setIsQuestionSpeaking(false)
			}

			window.speechSynthesis.speak(utterance)
		},
		[sessionData?.config.language],
	)

	useEffect(() => {
		if (!sessionId) {
			setSessionData(null)
			setSessionTranscripts([])
			setCurrentQuestion(null)
			setIsQuestionSpeaking(false)
			spokenQuestionRef.current = null
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
					focus_areas: sessionData.config.focus_areas,
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

	useEffect(() => {
		if (!currentQuestion || isQuestionLoading || isQuestionLimitReached) {
			if (hasSpeechSynthesis) {
				window.speechSynthesis.cancel()
			}
			setIsQuestionSpeaking(false)
			return
		}

		speakCurrentQuestion(currentQuestion)

		return () => {
			if (hasSpeechSynthesis) {
				window.speechSynthesis.cancel()
			}
		}
	}, [currentQuestion, hasSpeechSynthesis, isQuestionLimitReached, isQuestionLoading, speakCurrentQuestion])

	const handleStartRecording = async () => {
		if (!canStartRecording || !currentQuestion) {
			return
		}

		if (hasSpeechSynthesis) {
			window.speechSynthesis.cancel()
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
						focus_areas: updatedSession.config.focus_areas,
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
		if (hasSpeechSynthesis) {
			window.speechSynthesis.cancel()
		}

		spokenQuestionRef.current = null
		setIsQuestionSpeaking(false)
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
	const aiWindowStatus = isQuestionLoading
		? 'Generating'
		: isQuestionSpeaking
			? 'Speaking'
			: isQuestionLimitReached
				? 'Complete'
				: 'Ready'
	const userWindowStatus = isRecording ? 'Recording' : uiState === 'processing' ? 'Processing' : 'Ready'
	const questionAudioLabel = isQuestionSpeaking
		? 'Speaking now'
		: hasSpeechSynthesis
			? 'Waiting to speak'
			: 'Audio unavailable'
	const replayQuestion = () => {
		if (!currentQuestion) {
			return
		}

		speakCurrentQuestion(currentQuestion, true)
	}

	return (
		<main className="page page-interview">
			<section className="interview-room">
				<header className="interview-room__hero">
					<div>
						<p className="eyebrow">AI Mock Interview</p>
						<h1>Interview Room</h1>
					</div>

					<div className="interview-room__meta">
						<div className="interview-meta-row">
							<span className="meta-pill">Question {displayQuestionNumber}</span>
						</div>
						<div className="interview-actions interview-actions--top">
							<button
								type="button"
								className="btn btn-primary btn-animated"
								onClick={() => {
									void handleStartRecording()
								}}
								disabled={!canStartRecording || !currentQuestion}
							>
								{isQuestionLimitReached ? 'Session Complete' : 'Start Recording'}
							</button>
							<button
								type="button"
								className="btn btn-ghost btn-animated"
								onClick={() => {
									void handleStopAndTranscribe()
								}}
								disabled={!isRecording || uiState === 'processing'}
							>
								Stop and Transcribe
							</button>
							<button
								type="button"
								className="btn btn-ghost btn-animated"
								onClick={handleRetry}
								disabled={uiState === 'processing'}
							>
								Retry
							</button>
							<Link className="btn btn-primary btn-animated" to="/dashboard">
								Back to Dashboard
							</Link>
						</div>
					</div>
				</header>

				<div className="interview-room__body">
					<div className="interview-room__stage">
						<div className="zoom-grid">
							<section className={`video-window ${isQuestionSpeaking || isQuestionLoading ? 'is-active' : ''}`}>
								<div className="video-window__chrome">
									<span className="video-window__name">AI Interviewer</span>
									<span className="meta-pill">{aiWindowStatus}</span>
								</div>
								<div className="video-window__screen video-window__screen--ai">
									<div className="video-window__content">
										<WaveformVisualizer
											values={waveformData}
											isRecording={false}
											isProcessing={isQuestionLoading}
											isSpeaking={isQuestionSpeaking || isQuestionLoading}
											label={`AI Interviewer • ${questionAudioLabel}`}
											variant="ai"
										/>
										<div className="video-window__actions">
											<button
												type="button"
												className="btn btn-ghost btn-animated replay-btn"
												onClick={replayQuestion}
												disabled={!currentQuestion || isQuestionLoading || uiState === 'processing'}
											>
												Replay question audio
											</button>
										</div>
									</div>
								</div>
							</section>

							<section className={`video-window ${isRecording ? 'is-active' : ''}`}>
								<div className="video-window__chrome">
									<span className="video-window__name">You</span>
									<span className="meta-pill">{userWindowStatus}</span>
								</div>
								<div className="video-window__screen video-window__screen--user">
									<div className="video-window__content">
										<WaveformVisualizer
											values={waveformData}
											isRecording={isRecording}
											isProcessing={uiState === 'processing'}
											isSpeaking={isRecording || uiState === 'processing'}
											label={`You • ${formatElapsedTime(elapsedMs)}`}
											variant="user"
										/>
										<p className="video-window__microcopy participant-hint">
											{isRecording
												? 'Recording in progress. Stop when your answer is complete.'
												: 'Ready to respond. Start recording when you are prepared.'}
										</p>
									</div>
								</div>
							</section>
						</div>

						<div className="session-progress-panel session-progress-panel--dark">
							<div className="session-progress-head">
								<strong>Progress</strong>
								<span>
									Completed {completedQuestions} / {progressDenominator} questions
								</span>
							</div>
							<div
								className="session-progress-track"
								role="progressbar"
								aria-valuemin={0}
								aria-valuemax={progressDenominator}
								aria-valuenow={completedQuestions}
							>
								<div className="session-progress-fill" style={{ width: `${progressPercent}%` }} />
							</div>
							{isQuestionLimitReached && (
								<p className="session-progress-note">All configured questions are complete for this session.</p>
							)}
						</div>

						{uiState === 'processing' && (
							<p className="server-error server-error--light">Processing audio and generating transcript...</p>
						)}

						{uiState === 'failed' && <p className="server-error server-error--light">{effectiveErrorMessage}</p>}

						{uiState === 'done' && transcriptResponse?.transcript_text && null}
					</div>

					<aside className="interview-chat-panel">
						<div className="interview-chat-panel__head">
							<div>
								<p className="eyebrow">Chat History</p>
								<h2>Questions and Answers</h2>
							</div>
							<span className="meta-pill">{chatEntries.length} turns</span>
						</div>

						<br />

						<div className="interview-chat-panel__body">
							{isSessionLoading ? (
								<p className="chat-empty">Loading transcript history...</p>
							) : chatEntries.length === 0 ? (
								<p className="chat-empty">No saved turns yet. The conversation will appear here as you continue.</p>
							) : (
								chatEntries.map((entry) => (
									<article key={entry.id} className="chat-turn">
										<div className="chat-bubble chat-bubble--ai">
											<div className="chat-bubble__meta">
												<span>AI interviewer</span>
												<span>
													Q{entry.questionIndex} · {formatQuestionType(entry.questionType)}
												</span>
											</div>
											<p>{entry.question}</p>
											{entry.isLive && (
												<span className="chat-live-chip">Speaking now</span>
											)}
										</div>

										{entry.answer ? (
											<div className="chat-bubble chat-bubble--user">
												<div className="chat-bubble__meta">
													<span>You</span>
													<span>
														{entry.durationSeconds !== null ? `${entry.durationSeconds.toFixed(2)}s` : 'Recorded answer'}
													</span>
												</div>
												<p>{entry.answer}</p>
											</div>
										) : entry.isLive ? (
											<div className="chat-typing">Waiting for your response...</div>
										) : null}

										{entry.evaluationScore !== null && entry.evaluationFeedback && (
											<div className="chat-feedback">
												<div className="chat-feedback__head">
													<strong>Feedback</strong>
													<span>Score {entry.evaluationScore.toFixed(2)}</span>
												</div>
												<p>{entry.evaluationFeedback}</p>
											</div>
										)}
									</article>
								))
							)}
						</div>
					</aside>
				</div>

			</section>
		</main>
	)
}
