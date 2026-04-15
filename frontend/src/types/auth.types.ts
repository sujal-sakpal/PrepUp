/**
 * Public user profile returned by backend auth endpoints.
 */
export interface UserProfile {
	id: string
	email: string
	full_name: string
	created_at: string
	updated_at: string
}

/**
 * Request payload for user registration.
 */
export interface RegisterRequest {
	email: string
	password: string
	full_name: string
}

/**
 * Request payload for user login.
 */
export interface LoginRequest {
	email: string
	password: string
}

/**
 * Request payload for refreshing tokens.
 */
export interface RefreshTokenRequest {
	refresh_token: string
}

/**
 * JWT token pair response returned by login/refresh endpoints.
 */
export interface TokenResponse {
	access_token: string
	refresh_token: string
	token_type: 'bearer'
}
