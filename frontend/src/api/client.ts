import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/store/authStore'
import type { TokenResponse } from '@/types/auth.types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

/**
 * Main API client used by application modules.
 */
export const apiClient = axios.create({
	baseURL: API_BASE_URL,
	timeout: 30_000,
	headers: {
		'Content-Type': 'application/json',
	},
})

const rawClient = axios.create({
	baseURL: API_BASE_URL,
	timeout: 30_000,
	headers: {
		'Content-Type': 'application/json',
	},
})

let isRefreshing = false
let pendingRefresh: Promise<string | null> | null = null

function attachAccessToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
	const token = useAuthStore.getState().accessToken
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}

	return config
}

async function refreshAccessToken(): Promise<string | null> {
	const { refreshToken, setTokens, logout } = useAuthStore.getState()
	if (!refreshToken) {
		logout()
		return null
	}

	try {
		const { data } = await rawClient.post<TokenResponse>('/auth/refresh', {
			refresh_token: refreshToken,
		})

		setTokens(data)
		return data.access_token
	} catch {
		logout()
		return null
	}
}

apiClient.interceptors.request.use(attachAccessToken)

apiClient.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const originalRequest = error.config
		const isUnauthorized = error.response?.status === 401
		const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh')

		if (!originalRequest || !isUnauthorized || isRefreshRequest) {
			return Promise.reject(error)
		}

		const retryFlag = (originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })
			._retry
		if (retryFlag) {
			return Promise.reject(error)
		}

		;(originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry = true

		if (!isRefreshing) {
			isRefreshing = true
			pendingRefresh = refreshAccessToken().finally(() => {
				isRefreshing = false
			})
		}

		const nextAccessToken = await pendingRefresh
		if (!nextAccessToken) {
			return Promise.reject(error)
		}

		originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`
		return apiClient.request(originalRequest)
	},
)
