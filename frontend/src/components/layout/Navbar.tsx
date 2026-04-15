import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'

/**
 * Main navigation bar shown across all public and protected pages.
 */
export function Navbar() {
	const navigate = useNavigate()
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
	const user = useAuthStore((state) => state.user)
	const logout = useAuthStore((state) => state.logout)

	const handleLogout = (): void => {
		logout()
		navigate('/')
	}

	return (
		<header className="navbar">
			<Link to="/" className="brand-link">
				PrepUp
			</Link>

			<nav className="nav-links" aria-label="Primary">
				<NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
					Home
				</NavLink>

				{isAuthenticated ? (
					<NavLink
						to="/dashboard"
						className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
					>
						Dashboard
					</NavLink>
				) : null}
			</nav>

			<div className="auth-actions">
				{isAuthenticated ? (
					<>
						<span className="user-pill">{user?.full_name ?? 'User'}</span>
						<button type="button" className="btn btn-ghost" onClick={handleLogout}>
							Logout
						</button>
					</>
				) : (
					<>
						<Link className="btn btn-ghost" to="/login">
							Login
						</Link>
						<Link className="btn btn-primary" to="/register">
							Register
						</Link>
					</>
				)}
			</div>
		</header>
	)
}
