import { create } from 'zustand'

import type { DifficultyLevel, InterviewConfig, InterviewType } from '@/types/session.types'

interface ConfigureState {
	currentStep: 1 | 2 | 3 | 4
	config: InterviewConfig
}

interface ConfigureActions {
	setDomain: (domain: string) => void
	setRole: (role: string) => void
	setInterviewType: (interviewType: InterviewType) => void
	setDifficulty: (difficulty: DifficultyLevel) => void
	setQuestionCount: (questionCount: number) => void
	setFocusAreas: (focusAreas: string[]) => void
	nextStep: () => void
	prevStep: () => void
	setStep: (step: 1 | 2 | 3 | 4) => void
	reset: () => void
}

const initialConfig: InterviewConfig = {
	domain: '',
	role: '',
	interview_type: 'technical',
	difficulty: 'medium',
	question_count: 5,
	focus_areas: [],
	language: 'en',
}

export const useConfigStore = create<ConfigureState & ConfigureActions>((set) => ({
	currentStep: 1,
	config: initialConfig,

	setDomain: (domain) =>
		set((state) => ({
			config: { ...state.config, domain },
		})),

	setRole: (role) =>
		set((state) => ({
			config: { ...state.config, role },
		})),

	setInterviewType: (interviewType) =>
		set((state) => ({
			config: {
				...state.config,
				interview_type: interviewType
					.toLowerCase()
					.replace(' ', '_') as InterviewType,
			},
		})),

	setDifficulty: (difficulty) =>
		set((state) => ({
			config: {
				...state.config,
				difficulty: difficulty.toLowerCase() as DifficultyLevel,
			},
		})),

	setQuestionCount: (questionCount) =>
		set((state) => ({
			config: { ...state.config, question_count: questionCount },
		})),

	setFocusAreas: (focusAreas) =>
		set((state) => ({
			config: { ...state.config, focus_areas: focusAreas },
		})),

	nextStep: () =>
		set((state) => ({
			currentStep: state.currentStep < 4 ? (state.currentStep + 1) as 1 | 2 | 3 | 4 : 4,
		})),

	prevStep: () =>
		set((state) => ({
			currentStep: state.currentStep > 1 ? (state.currentStep - 1) as 1 | 2 | 3 | 4 : 1,
		})),

	setStep: (step) => set({ currentStep: step }),

	reset: () =>
		set({
			currentStep: 1,
			config: initialConfig,
		}),
}))
