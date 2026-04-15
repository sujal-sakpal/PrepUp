import { Navigate, Outlet } from 'react-router-dom'

import { useIsAuthenticated } from '@/store/authStore'

/**
 * Route guard that blocks access to private routes for unauthenticated users.
 */
export function ProtectedRoute() {
	const isAuthenticated = useIsAuthenticated()

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />
	}

	return <Outlet />
}
