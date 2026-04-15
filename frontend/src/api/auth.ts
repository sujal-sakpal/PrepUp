import { apiClient } from './client'

import type {
	LoginRequest,
	RefreshTokenRequest,
	RegisterRequest,
	TokenResponse,
	UserProfile,
} from '@/types/auth.types'

/**
 * Authentication API abstraction used by login/register pages and app startup.
 */
export const authApi = {
	register: async (payload: RegisterRequest): Promise<UserProfile> => {
		const { data } = await apiClient.post<UserProfile>('/auth/register', payload)
		return data
	},

	login: async (payload: LoginRequest): Promise<TokenResponse> => {
		const { data } = await apiClient.post<TokenResponse>('/auth/login', payload)
		return data
	},

	refresh: async (payload: RefreshTokenRequest): Promise<TokenResponse> => {
		const { data } = await apiClient.post<TokenResponse>('/auth/refresh', payload)
		return data
	},

	me: async (): Promise<UserProfile> => {
		const { data } = await apiClient.get<UserProfile>('/auth/me')
		return data
	},
} as const
