import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { sessionsApi } from '@/api/sessions'
import { useAuthStore } from '@/store/authStore'
import type { SessionResponse } from '@/types/session.types'
import { formatLabel } from '@/utils/formatters'

import './DashboardPage.css'

interface DeleteConfirmation {
	isOpen: boolean
	sessionId: string | null
	sessionRole: string | null
	isDeleting: boolean
}

/**
 * Dashboard showing session history and quick actions.
 */
export default function DashboardPage() {
	const user = useAuthStore((state) => state.user)
	const [sessions, setSessions] = useState<SessionResponse[]>([])
	const [totalSessions, setTotalSessions] = useState(0)
	const [isLoadingSessions, setIsLoadingSessions] = useState(true)
	const [hasInterviews, setHasInterviews] = useState<boolean | null>(null)
	const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmation>({
		isOpen: false,
		sessionId: null,
		sessionRole: null,
		isDeleting: false,
	})

	useEffect(() => {
		let isMounted = true

		const loadSessions = async (): Promise<void> => {
			try {
				setIsLoadingSessions(true)
				const response = await sessionsApi.listSessions({ skip: 0, limit: 10 })
				if (isMounted) {
					setSessions(response.items)
					setTotalSessions(response.total)
					setHasInterviews(response.total > 0)
				}
			} catch {
				if (isMounted) {
					setSessions([])
					setTotalSessions(0)
					setHasInterviews(false)
				}
			} finally {
				if (isMounted) {
					setIsLoadingSessions(false)
				}
			}
		}

		void loadSessions()

		return () => {
			isMounted = false
		}
	}, [])

	const formatDate = (dateString: string): string => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
	}

	const getSessionAction = (session: SessionResponse): { to: string; label: string } => {
		if (session.status === 'configured') {
			return { to: `/interview/${session.id}`, label: 'Start Interview' }
		}

		if (session.status === 'completed') {
			return { to: `/analysis/${session.id}`, label: 'Show Analysis' }
		}

		if (session.status === 'abandoned') {
			return { to: '/configure', label: 'Try Again' }
		}

		return { to: `/interview/${session.id}`, label: 'Continue' }
	}

	const handleDeleteClick = (sessionId: string, role: string): void => {
		setDeleteConfirm({
			isOpen: true,
			sessionId,
			sessionRole: role,
			isDeleting: false,
		})
	}

	const handleDeleteConfirm = async (): Promise<void> => {
		if (!deleteConfirm.sessionId) return

		setDeleteConfirm((prev) => ({ ...prev, isDeleting: true }))

		try {
			await sessionsApi.deleteSession(deleteConfirm.sessionId)
			const updatedSessions = sessions.filter((s) => s.id !== deleteConfirm.sessionId)
			setSessions(updatedSessions)
			setHasInterviews(updatedSessions.length > 0)
			setTotalSessions((prev) => Math.max(0, prev - 1))
			setDeleteConfirm({ isOpen: false, sessionId: null, sessionRole: null, isDeleting: false })
		} catch (error) {
			console.error('Failed to delete session:', error)
			setDeleteConfirm((prev) => ({ ...prev, isDeleting: false }))
		}
	}

	const handleDeleteCancel = (): void => {
		setDeleteConfirm({ isOpen: false, sessionId: null, sessionRole: null, isDeleting: false })
	}

	const completedSessions = sessions.filter(
		(session) => session.status === 'completed' && session.final_analysis,
	)
	const averageScore =
		completedSessions.length > 0
			? completedSessions.reduce((sum, session) => sum + (session.final_analysis?.overall_score ?? 0), 0) /
			  completedSessions.length
			: 0
	const bestSession = completedSessions.reduce<SessionResponse | null>((best, current) => {
		if (!best) {
			return current
		}
		const currentScore = current.final_analysis?.overall_score ?? 0
		const bestScore = best.final_analysis?.overall_score ?? 0
		return currentScore > bestScore ? current : best
	}, null)

	if (isLoadingSessions || hasInterviews === null) {
		return (
			<main className="page page-dashboard">
				<section className="dashboard-card">
					<h1>Welcome, {user?.full_name ?? 'User'}.</h1>
					<p className="hero-copy">Loading your interview history...</p>

					<div className="dashboard-actions">
						<Link to="/configure" className="btn btn-primary">
							Start Interview
						</Link>
					</div>
				</section>
			</main>
		)
	}

	return (
		<main className="page page-dashboard">
			<section className="dashboard-card">
				<h1>Welcome, {user?.full_name ?? 'User'}.</h1>
				<p className="hero-copy">
					{hasInterviews
						? 'Start a new interview session or continue exploring your progress insights.'
						: 'Start with your first interview.'}
				</p>

				<div className="dashboard-actions">
					<Link to="/configure" className="btn btn-primary">
						{hasInterviews === false ? 'Start Your First Interview' : 'Start Interview'}
					</Link>
				</div>
			</section>

			{hasInterviews === true ? (
				<section className="dashboard-card sessions-section">
					<p className="eyebrow">Your Sessions</p>
					<h2>Recent Interview Sessions</h2>

					<div className="stats-grid">
						<div className="stat-card">
							<div className="stat-value">{totalSessions}</div>
							<div className="stat-label">Total Sessions</div>
						</div>
						<div className="stat-card">
							<div className="stat-value">{sessions.length}</div>
							<div className="stat-label">Showing (Latest 10)</div>
						</div>
						<div className="stat-card">
							<div className="stat-value">{(averageScore * 100).toFixed(0)}%</div>
							<div className="stat-label">Average Score</div>
						</div>
						<div className="stat-card">
							<div className="stat-value">{bestSession?.config.role ?? 'N/A'}</div>
							<div className="stat-label">Best Role</div>
						</div>
					</div>

					{sessions.length > 0 ? (
						<div className="sessions-table">
							<table role="presentation">
								<thead>
									<tr>
										<th>Role</th>
										<th>Type</th>
										<th>Difficulty</th>
										<th>Status</th>
										<th>Score</th>
										<th>Action</th>
										<th>Created</th>
									</tr>
								</thead>
								<tbody>
									{sessions.map((session) => (
										<tr key={session.id} className={`status-${session.status}`}>
											<td className="cell-role">{session.config.role}</td>
											<td className="cell-type">{formatLabel(session.config.interview_type)}</td>
											<td className="cell-difficulty">{formatLabel(session.config.difficulty)}</td>
											<td className="cell-status">
												<span className={`badge badge-${session.status}`}>{formatLabel(session.status)}</span>
											</td>
											<td>
												{session.final_analysis ? (
													<span className="session-score-badge">
														{(session.final_analysis.overall_score * 100).toFixed(0)}%
													</span>
												) : (
													<span className="hero-copy">--</span>
												)}
											</td>
												<td className="cell-action">
												<div className="session-actions-group">
													<Link className="btn btn-ghost btn-animated session-action" to={getSessionAction(session).to}>
														{getSessionAction(session).label}
													</Link>
													<button
														type="button"
														className="btn btn-delete"
														onClick={() => handleDeleteClick(session.id, session.config.role)}
													>
														Delete
													</button>
												</div>
												</td>
											<td className="cell-date">{formatDate(session.created_at)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : null}
				</section>
			) : null}

			{deleteConfirm.isOpen && (
				<div className="modal-overlay" onClick={handleDeleteCancel}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<h3>Delete Session?</h3>
						<p>
							Are you sure you want to delete the session for <strong>{deleteConfirm.sessionRole}</strong>? This action cannot be undone.
						</p>
						<div className="modal-actions">
							<button
								type="button"
								className="btn btn-ghost"
								onClick={handleDeleteCancel}
								disabled={deleteConfirm.isDeleting}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-delete"
								onClick={handleDeleteConfirm}
								disabled={deleteConfirm.isDeleting}
							>
								{deleteConfirm.isDeleting ? 'Deleting...' : 'Delete'}
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	)
}
