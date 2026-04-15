import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { sessionsApi } from '@/api/sessions'
import { useAuthStore } from '@/store/authStore'
import type { SessionResponse } from '@/types/session.types'
import { formatLabel } from '@/utils/formatters'

/**
 * Dashboard showing session history and quick actions.
 */
export default function DashboardPage() {
	const user = useAuthStore((state) => state.user)
	const [sessions, setSessions] = useState<SessionResponse[]>([])
	const [totalSessions, setTotalSessions] = useState(0)
	const [isLoadingSessions, setIsLoadingSessions] = useState(true)
	const [hasInterviews, setHasInterviews] = useState<boolean | null>(null)

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

	if (isLoadingSessions || hasInterviews === null) {
		return (
			<main className="page page-dashboard">
				<section className="dashboard-card">
					<h1>Welcome, {user?.full_name ?? 'User'}.</h1>
					<p className="hero-copy">Loading your interview history...</p>
					<br />
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

                <br />

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
												<td className="cell-action">
													<Link className="btn btn-ghost btn-animated session-action" to={getSessionAction(session).to}>
														{getSessionAction(session).label}
													</Link>
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
		</main>
	)
}
