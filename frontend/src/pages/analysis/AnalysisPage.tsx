import { Link, useParams } from 'react-router-dom'

/**
 * Analysis page scaffold for completed interview sessions.
 */
export default function AnalysisPage() {
	const { sessionId } = useParams<{ sessionId: string }>()

	return (
		<main className="page page-dashboard">
			<section className="dashboard-card">
				<p className="eyebrow">Analysis</p>
				<h1>Session {sessionId}</h1>
				<p className="hero-copy">
					Detailed session analysis will appear here once the interview pipeline stores results.
				</p>
				<div className="dashboard-actions">
					<Link className="btn btn-primary" to="/dashboard">
						Back to Dashboard
					</Link>
				</div>
			</section>
		</main>
	)
}
