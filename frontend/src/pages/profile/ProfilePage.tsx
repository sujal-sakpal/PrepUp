import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { sessionsApi } from '@/api/sessions'
import { useAuthStore } from '@/store/authStore'
import type { SessionResponse } from '@/types/session.types'

import './ProfilePage.css'

/**
 * Basic authenticated profile page with identity details and progress summary.
 */
export default function ProfilePage() {
	const user = useAuthStore((state) => state.user)
	const [sessions, setSessions] = useState<SessionResponse[]>([])
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		let active = true

		const load = async (): Promise<void> => {
			try {
				setIsLoading(true)
				const response = await sessionsApi.listSessions({ skip: 0, limit: 20 })
				if (active) {
					setSessions(response.items)
				}
			} catch {
				if (active) {
					setSessions([])
				}
			} finally {
				if (active) {
					setIsLoading(false)
				}
			}
		}

		void load()

		return () => {
			active = false
		}
	}, [])

	const completedSessions = sessions.filter(
		(session) => session.status === 'completed' && session.final_analysis,
	)
	const averageScore =
		completedSessions.length > 0
			? completedSessions.reduce((sum, session) => sum + (session.final_analysis?.overall_score ?? 0), 0) /
			  completedSessions.length
			: 0
	const totalQuestions = sessions.reduce((sum, session) => sum + session.qa_pairs.length, 0)

	const initials = user?.full_name
		? user.full_name
			.split(' ')
			.map((part) => part[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
		: 'U'

	return (
		<main className="page page-profile">
			<section className="dashboard-card profile-card">
				<div className="analysis-hero">
					<div>
						<p className="eyebrow">Profile</p>
						<h1>Your Account</h1>
						<p className="hero-copy">
							Review your account details, interview activity, and overall practice momentum in one place.
						</p>
					</div>
					<div className="analysis-actions">
						<Link className="btn btn-ghost" to="/dashboard">
							Dashboard
						</Link>
						<Link className="btn btn-primary" to="/configure">
							New Interview
						</Link>
					</div>
				</div>
					<div className="profile-layout">
						<div className="profile-main-stack">
							<div className="analysis-panel profile-identity profile-identity--split">
								<div className="profile-avatar" aria-hidden="true">
									{initials}
								</div>
								<div>
									<p className="eyebrow">Account</p>
									<h2>{user?.full_name ?? 'User'}</h2>
									<p className="hero-copy">{user?.email ?? 'No email available'}</p>
								</div>
							</div>

							<div className="profile-grid stats-grid profile-stats-grid">
								<div className="stat-card analysis-stat-card">
									<div className="stat-label">Sessions</div>
									<div className="stat-value">{isLoading ? '...' : sessions.length}</div>
									<p className="analysis-card-note">Total interviews recorded</p>
								</div>
								<div className="stat-card analysis-stat-card">
									<div className="stat-label">Completed</div>
									<div className="stat-value">{isLoading ? '...' : completedSessions.length}</div>
									<p className="analysis-card-note">Sessions with full analysis</p>
								</div>
								<div className="stat-card analysis-stat-card">
									<div className="stat-label">Average Score</div>
									<div className="stat-value">{isLoading ? '...' : `${(averageScore * 100).toFixed(0)}%`}</div>
									<p className="analysis-card-note">Across completed sessions</p>
								</div>
								<div className="stat-card analysis-stat-card">
									<div className="stat-label">Questions Answered</div>
									<div className="stat-value">{isLoading ? '...' : totalQuestions}</div>
									<p className="analysis-card-note">All captured responses</p>
								</div>
							</div>

							<div className="analysis-panel profile-activity-panel">
								<div className="analysis-panel-head">
									<h2>Recent Activity</h2>
									<span>Latest sessions</span>
								</div>
								{sessions.length > 0 ? (
									<div className="analysis-timeline profile-activity-scroll">
										{sessions.map((session, index) => (
											<div key={session.id} className="analysis-timeline-item profile-session-item">
												<div className="analysis-timeline-item__index">{index + 1}</div>
												<div className="analysis-timeline-item__body">
													<div className="transcript-history-header">
														<strong>{session.config.role}</strong>
														<span>{session.status}</span>
													</div>
													<p>
														{session.config.interview_type} · {session.config.difficulty} · {session.qa_pairs.length} answers
													</p>
													<p>
														<Link
															className={`profile-session-action ${session.final_analysis ? 'profile-session-action--analysis' : 'profile-session-action--continue'}`}
															to={session.final_analysis ? `/analysis/${session.id}` : `/interview/${session.id}`}
														>
															{session.final_analysis ? 'Open analysis' : 'Continue interview'}
														</Link>
													</p>
												</div>
											</div>
										))}
									</div>
								) : (
									<p className="hero-copy">No sessions yet. Start a new interview to populate your profile timeline.</p>
								)}
							</div>
						</div>

						<div className="profile-side-stack">
							<div className="analysis-panel">
								<div className="analysis-panel-head">
									<h2>Profile Details</h2>
									<span>Account information</span>
								</div>
								<div className="profile-details-list">
									<div>
										<span>Email</span>
										<strong>{user?.email ?? 'N/A'}</strong>
									</div>
									<div>
										<span>Name</span>
										<strong>{user?.full_name ?? 'N/A'}</strong>
									</div>
									<div>
										<span>Member Since</span>
										<strong>{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}</strong>
									</div>
								</div>
							</div>

							<div className="analysis-panel">
								<div className="analysis-panel-head">
									<h2>Quick Links</h2>
									<span>Navigation</span>
								</div>
								<div className="analysis-chip-list">
									<Link className="analysis-chip analysis-chip--neutral" to="/dashboard">Dashboard</Link>
									<Link className="analysis-chip analysis-chip--neutral" to="/configure">Start Interview</Link>
								</div>
							</div>

							<div className="analysis-panel">
								<div className="analysis-panel-head">
									<h2>Practice Focus</h2>
									<span>Suggestion</span>
								</div>
								<p className="hero-copy">
									Build momentum by scheduling one focused mock interview per week and revisiting sessions with the lowest scoring category first.
								</p>
							</div>
						</div>
					</div>
			</section>
		</main>
	)
}