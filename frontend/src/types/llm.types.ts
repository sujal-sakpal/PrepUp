export interface QuestionGenerationRequest {
	domain: string
	role: string
	interview_type: string
	difficulty: string
	focus_areas?: string[]
	language?: string
}

export interface QuestionGenerationResponse {
	questions: string[]
}

export interface NextQuestionRequest {
	domain: string
	role: string
	interview_type: string
	current_score: number
	questions_remaining: number
	focus_areas?: string[]
	conversation_summary?: string
}

export interface NextQuestionResponse {
	question: string
}

export interface AnswerEvaluation {
	score: number
	strengths: string[]
	weaknesses: string[]
	feedback: string
	keywords_mentioned: string[]
	keywords_missed: string[]
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
