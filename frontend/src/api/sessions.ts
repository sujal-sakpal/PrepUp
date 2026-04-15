import { apiClient } from './client'

import type {
	SessionCreateRequest,
	SessionListResponse,
	SessionResponse,
} from '@/types/session.types'

export interface ListSessionsParams {
	skip?: number
	limit?: number
}

/**
 * Sessions API abstraction for interview session CRUD endpoints.
 */
export const sessionsApi = {
	createSession: async (payload: SessionCreateRequest): Promise<SessionResponse> => {
		const { data } = await apiClient.post<SessionResponse>('/sessions', payload)
		return data
	},

	listSessions: async (params: ListSessionsParams = {}): Promise<SessionListResponse> => {
		const { data } = await apiClient.get<SessionListResponse>('/sessions', { params })
		return data
	},

	getSessionById: async (sessionId: string): Promise<SessionResponse> => {
		const { data } = await apiClient.get<SessionResponse>(`/sessions/${sessionId}`)
		return data
	},
} as const
