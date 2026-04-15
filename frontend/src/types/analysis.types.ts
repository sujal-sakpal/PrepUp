export type TranscriptionStatus = 'audio_normalized' | 'transcribed'

export type TranscriptionErrorCode =
	| 'MIC_PERMISSION_DENIED'
	| 'INVALID_AUDIO_BYTES'
	| 'INVALID_AUDIO_TYPE'
	| 'INVALID_AUDIO_SIZE'
	| 'INVALID_AUDIO_DURATION'
	| 'AUDIO_CONVERSION_FAILED'
	| 'AUDIO_CONVERSION_TIMEOUT'
	| 'TRANSCRIPTION_PROVIDER_FAILURE'
	| 'TRANSCRIPTION_TIMEOUT'

export interface AudioNormalizationMetadata {
	original_mime_type: string
	original_size_bytes: number
	normalized_size_bytes: number
	normalized_format: 'wav'
	sample_rate_hz: 16000
	channels: 1
	duration_seconds: number
	conversion_latency_ms: number
}

export interface TranscriptionResponse {
	request_id: string
	status: TranscriptionStatus
	session_id: string | null
	question_index: number | null
	transcript_text: string | null
	provider: string | null
	provider_latency_ms: number | null
	audio: AudioNormalizationMetadata
	warnings: string[]
}

export interface TranscriptionErrorDetail {
	code: TranscriptionErrorCode | string
	message: string
	retryable: boolean
	details: Record<string, string | number | boolean | null>
}

export interface TranscriptionErrorResponse {
	request_id: string
	error: TranscriptionErrorDetail
}

export interface TranscriptionRequestInput {
	audioBlob?: Blob
	sessionId?: string
	questionIndex?: number
	questionText?: string
	questionType?: 'opening' | 'followup' | 'closing'
	recordedDurationMs?: number
	captureError?: 'permission_denied'
}
