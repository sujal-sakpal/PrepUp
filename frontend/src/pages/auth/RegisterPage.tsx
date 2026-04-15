import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { registerSchema, type RegisterFormInput } from '@/validators/auth.validators'

/**
 * Registration page that creates a new account and immediately starts a session.
 */
export default function RegisterPage() {
	const navigate = useNavigate()
	const setTokens = useAuthStore((state) => state.setTokens)
	const setUser = useAuthStore((state) => state.setUser)
	const [serverError, setServerError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterFormInput>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			full_name: '',
			email: '',
			password: '',
		},
	})

	const onSubmit = async (formData: RegisterFormInput): Promise<void> => {
		try {
			setServerError(null)
			setIsSubmitting(true)

			await authApi.register(formData)
			const tokens = await authApi.login({ email: formData.email, password: formData.password })
			setTokens(tokens)
			const user = await authApi.me()
			setUser(user)
			navigate('/dashboard')
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				const detail =
					typeof error.response?.data?.detail === 'string'
						? error.response.data.detail
						: 'Registration failed. Please review your details.'
				setServerError(detail)
			} else {
				setServerError('Unexpected error occurred while registering.')
			}
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="page page-auth">
			<section className="auth-card" aria-labelledby="register-heading">
				<h1 id="register-heading">Create Account</h1>
				<p className="auth-subtitle">Start your AI mock interview journey in minutes.</p>

				<form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
					<label htmlFor="register-name" className="field-label">
						Full name
					</label>
					<input id="register-name" type="text" className="field-input" {...register('full_name')} />
					{errors.full_name ? <p className="field-error">{errors.full_name.message}</p> : null}

					<label htmlFor="register-email" className="field-label">
						Email
					</label>
					<input
						id="register-email"
						type="email"
						className="field-input"
						{...register('email')}
					/>
					{errors.email ? <p className="field-error">{errors.email.message}</p> : null}

					<label htmlFor="register-password" className="field-label">
						Password
					</label>
					<input
						id="register-password"
						type={showPassword ? 'text' : 'password'}
						className="field-input"
						{...register('password')}
					/>
					<label className="password-toggle" htmlFor="register-show-password">
						<input
							id="register-show-password"
							type="checkbox"
							checked={showPassword}
							onChange={(event) => setShowPassword(event.target.checked)}
						/>
						Show password
					</label>
					{errors.password ? <p className="field-error">{errors.password.message}</p> : null}

					{serverError ? <p className="field-error server-error">{serverError}</p> : null}

					<button type="submit" className="btn btn-primary auth-submit" disabled={isSubmitting}>
						{isSubmitting ? 'Creating account...' : 'Register'}
					</button>
				</form>

				<p className="auth-footer">
					Already have an account? <Link to="/login">Login</Link>
				</p>
			</section>
		</main>
	)
}
