import { create } from 'zustand'

import type { TokenResponse, UserProfile } from '@/types/auth.types'

const ACCESS_TOKEN_KEY = 'prepup_access_token'
const REFRESH_TOKEN_KEY = 'prepup_refresh_token'
const USER_KEY = 'prepup_user'

interface AuthState {
	accessToken: string | null
	refreshToken: string | null
	user: UserProfile | null
	isAuthenticated: boolean
}

interface AuthActions {
	setAuth: (tokens: TokenResponse, user: UserProfile) => void
	setTokens: (tokens: TokenResponse) => void
	setUser: (user: UserProfile) => void
	logout: () => void
}

function loadUserFromStorage(): UserProfile | null {
	const rawUser = localStorage.getItem(USER_KEY)
	if (!rawUser) {
		return null
	}

	try {
		const parsedUser: unknown = JSON.parse(rawUser)
		if (typeof parsedUser === 'object' && parsedUser !== null) {
			return parsedUser as UserProfile
		}

		return null
	} catch {
		return null
	}
}

const initialAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
const initialRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
const initialUser = loadUserFromStorage()

/**
 * Global authentication store for token and user profile state.
 */
export const useAuthStore = create<AuthState & AuthActions>((set) => ({
	accessToken: initialAccessToken,
	refreshToken: initialRefreshToken,
	user: initialUser,
	isAuthenticated: Boolean(initialAccessToken && initialUser),

	setAuth: (tokens, user) => {
		localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
		localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
		localStorage.setItem(USER_KEY, JSON.stringify(user))

		set({
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			user,
			isAuthenticated: true,
		})
	},

	setTokens: (tokens) => {
		localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
		localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)

		set((state) => ({
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			isAuthenticated: Boolean(tokens.access_token && state.user),
		}))
	},

	setUser: (user) => {
		localStorage.setItem(USER_KEY, JSON.stringify(user))

		set((state) => ({
			user,
			isAuthenticated: Boolean(state.accessToken),
		}))
	},

	logout: () => {
		localStorage.removeItem(ACCESS_TOKEN_KEY)
		localStorage.removeItem(REFRESH_TOKEN_KEY)
		localStorage.removeItem(USER_KEY)

		set({
			accessToken: null,
			refreshToken: null,
			user: null,
			isAuthenticated: false,
		})
	},
}))

export const useCurrentUser = (): UserProfile | null => useAuthStore((state) => state.user)
export const useIsAuthenticated = (): boolean =>
	useAuthStore((state) => state.isAuthenticated)
