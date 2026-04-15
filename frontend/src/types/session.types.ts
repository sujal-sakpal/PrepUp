export type SessionStatus = 'configured' | 'in_progress' | 'completed' | 'abandoned'

export type InterviewType = 'technical' | 'behavioral' | 'mixed' | 'case_study'

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'adaptive'

export interface InterviewConfig {
	domain: string
	role: string
	interview_type: InterviewType
	difficulty: DifficultyLevel
	question_count: number
	focus_areas: string[]
	language: string
}

export interface SessionCreateRequest {
	config: InterviewConfig
}

export interface SessionResponse {
	id: string
	user_id: string
	status: SessionStatus
	config: InterviewConfig
	started_at: string | null
	ended_at: string | null
	duration_seconds: number
	created_at: string
	updated_at: string
}

export interface SessionListResponse {
	items: SessionResponse[]
	total: number
	skip: number
	limit: number
}
