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

export interface AnswerEvaluation {
	score: number
	strengths: string[]
	weaknesses: string[]
	feedback: string
	keywords_mentioned: string[]
	keywords_missed: string[]
}

export interface SessionQAPair {
	question_index: number
	question: string | null
	question_type: 'opening' | 'followup' | 'closing'
	transcription: string
	recorded_duration_seconds: number | null
	evaluation: AnswerEvaluation | null
	created_at: string
}

export interface CategoryScores {
	technical_accuracy: number
	communication: number
	problem_solving: number
	depth_of_knowledge: number
	confidence: number
}

export interface FinalAnalysis {
	overall_score: number
	category_scores: CategoryScores
	top_strengths: string[]
	improvement_areas: string[]
	detailed_feedback: string
	recommended_resources: string[]
	hire_recommendation: 'strong_hire' | 'hire' | 'maybe' | 'no_hire'
}

export interface SessionResponse {
	id: string
	user_id: string
	status: SessionStatus
	config: InterviewConfig
	started_at: string | null
	ended_at: string | null
	duration_seconds: number
	qa_pairs: SessionQAPair[]
	final_analysis: FinalAnalysis | null
	created_at: string
	updated_at: string
}

export interface SessionListResponse {
	items: SessionResponse[]
	total: number
	skip: number
	limit: number
}
