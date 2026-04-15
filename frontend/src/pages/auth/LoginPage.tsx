import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { loginSchema, type LoginFormInput } from '@/validators/auth.validators'

/**
 * Login page that authenticates a user and stores token/session state.
 */
export default function LoginPage() {
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
	} = useForm<LoginFormInput>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	})

	const onSubmit = async (formData: LoginFormInput): Promise<void> => {
		try {
			setServerError(null)
			setIsSubmitting(true)

			const tokens = await authApi.login(formData)
			setTokens(tokens)
			const user = await authApi.me()
			setUser(user)
			navigate('/dashboard')
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				const detail =
					typeof error.response?.data?.detail === 'string'
						? error.response.data.detail
						: 'Login failed. Please verify your credentials.'
				setServerError(detail)
			} else {
				setServerError('Unexpected error occurred while logging in.')
			}
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="page page-auth">
			<section className="auth-card" aria-labelledby="login-heading">
				<h1 id="login-heading">Login</h1>
				<p className="auth-subtitle">Welcome back. Continue your interview practice.</p>

				<form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
					<label htmlFor="login-email" className="field-label">
						Email
					</label>
					<input id="login-email" type="email" className="field-input" {...register('email')} />
					{errors.email ? <p className="field-error">{errors.email.message}</p> : null}

					<label htmlFor="login-password" className="field-label">
						Password
					</label>
					<input
						id="login-password"
						type={showPassword ? 'text' : 'password'}
						className="field-input"
						{...register('password')}
					/>
					<label className="password-toggle" htmlFor="login-show-password">
						<input
							id="login-show-password"
							type="checkbox"
							checked={showPassword}
							onChange={(event) => setShowPassword(event.target.checked)}
						/>
						Show password
					</label>
					{errors.password ? <p className="field-error">{errors.password.message}</p> : null}

					{serverError ? <p className="field-error server-error">{serverError}</p> : null}

					<button type="submit" className="btn btn-primary auth-submit" disabled={isSubmitting}>
						{isSubmitting ? 'Signing in...' : 'Login'}
					</button>
				</form>

				<p className="auth-footer">
					New here? <Link to="/register">Create an account</Link>
				</p>
			</section>
		</main>
	)
}
