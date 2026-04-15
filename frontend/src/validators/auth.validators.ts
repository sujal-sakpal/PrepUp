import { z } from 'zod'

/**
 * Validation schema for user login form.
 */
export const loginSchema = z.object({
	email: z.email('Please enter a valid email address.'),
	password: z.string().min(8, 'Password must be at least 8 characters.'),
})

/**
 * Validation schema for user registration form.
 */
export const registerSchema = z.object({
	full_name: z
		.string()
		.trim()
		.min(1, 'Full name is required.')
		.max(100, 'Full name must be at most 100 characters.'),
	email: z.email('Please enter a valid email address.'),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters.')
		.max(128, 'Password must be at most 128 characters.'),
})

export type LoginFormInput = z.infer<typeof loginSchema>
export type RegisterFormInput = z.infer<typeof registerSchema>
