import { Link, useParams } from 'react-router-dom'

/**
 * Interview room scaffold for Phase 3 routing.
 */
export default function InterviewRoomPage() {
	const { sessionId } = useParams<{ sessionId: string }>()

	return (
		<main className="page page-dashboard">
			<section className="dashboard-card">
				<p className="eyebrow">Interview Room</p>
				<h1>Session</h1>
				<p className="hero-copy">
					The interview room route is ready. The audio pipeline will plug into this screen in Phase 3.
				</p>
                <br />
				<div className="dashboard-actions">
					<Link className="btn btn-primary" to="/dashboard">
						Back to Dashboard
					</Link>
				</div>
			</section>
		</main>
	)
}
