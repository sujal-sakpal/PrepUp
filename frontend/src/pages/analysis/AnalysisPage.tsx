import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { llmApi } from '@/api/analysis'
import { sessionsApi } from '@/api/sessions'
import type { SessionResponse } from '@/types/session.types'

/**
 * Analysis page scaffold for completed interview sessions.
 */
export default function AnalysisPage() {
	const { sessionId } = useParams<{ sessionId: string }>()
	const [session, setSession] = useState<SessionResponse | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isGenerating, setIsGenerating] = useState(false)

	useEffect(() => {
		if (!sessionId) {
			setIsLoading(false)
			return
		}

		let active = true
		const load = async () => {
			setIsLoading(true)
			try {
				const data = await sessionsApi.getSessionById(sessionId)
				if (active) {
					setSession(data)
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
	}, [sessionId])

	const handleGenerateAnalysis = async () => {
		if (!sessionId) {
			return
		}

		setIsGenerating(true)
		try {
			await llmApi.generateFinalAnalysis(sessionId)
			const updated = await sessionsApi.getSessionById(sessionId)
			setSession(updated)
		} finally {
			setIsGenerating(false)
		}
	}

	if (isLoading) {
		return (
			<main className="page page-dashboard">
				<section className="dashboard-card">
					<p className="eyebrow">Analysis</p>
					<h1>Loading...</h1>
				</section>
			</main>
		)
	}

	if (!session) {
		return (
			<main className="page page-dashboard">
				<section className="dashboard-card">
					<p className="eyebrow">Analysis</p>
					<h1>Session not found</h1>
					<div className="dashboard-actions">
						<Link className="btn btn-primary" to="/dashboard">
							Back to Dashboard
						</Link>
					</div>
				</section>
			</main>
		)
	}

	const analysis = session.final_analysis

	return (
		<main className="page page-dashboard">
			<section className="dashboard-card">
				<p className="eyebrow">Analysis</p>
				<h1>{session.config.role} Interview Report</h1>
				<p className="hero-copy">Session {sessionId}</p>

				{analysis ? (
					<>
						<div className="stats-grid" style={{ marginTop: '1rem' }}>
							<div className="stat-card">
								<div className="stat-value">{(analysis.overall_score * 100).toFixed(0)}%</div>
								<div className="stat-label">Overall Score</div>
							</div>
							<div className="stat-card">
								<div className="stat-value">{analysis.hire_recommendation.replace('_', ' ')}</div>
								<div className="stat-label">Recommendation</div>
							</div>
						</div>

						<div className="transcript-history-panel">
							<h2>Top Strengths</h2>
							<ul className="transcript-history-list">
								{analysis.top_strengths.map((item) => (
									<li key={item} className="transcript-history-item">
										<p>{item}</p>
									</li>
								))}
							</ul>
						</div>

						<div className="transcript-history-panel">
							<h2>Improvement Areas</h2>
							<ul className="transcript-history-list">
								{analysis.improvement_areas.map((item) => (
									<li key={item} className="transcript-history-item">
										<p>{item}</p>
									</li>
								))}
							</ul>
						</div>

						<div className="transcript-history-panel">
							<h2>Detailed Feedback</h2>
							<p className="hero-copy">{analysis.detailed_feedback}</p>
						</div>
					</>
				) : (
					<div className="transcript-history-panel">
						<h2>Analysis Not Generated Yet</h2>
						<p className="hero-copy">Complete interview answers are available. Generate your report now.</p>
						<button className="btn btn-primary" type="button" onClick={() => void handleGenerateAnalysis()} disabled={isGenerating || session.qa_pairs.length === 0}>
							{isGenerating ? 'Generating...' : 'Generate Analysis'}
						</button>
					</div>
				)}

				<div className="transcript-history-panel">
					<h2>Question by Question</h2>
					{session.qa_pairs.length === 0 ? (
						<p className="hero-copy">No answers captured for this session yet.</p>
					) : (
						<ul className="transcript-history-list">
							{session.qa_pairs.map((pair, index) => (
								<li key={`${pair.created_at}-${index}`} className="transcript-history-item">
									<div className="transcript-history-header">
										<strong>Question #{index + 1}</strong>
										<span>{pair.evaluation ? `${(pair.evaluation.score * 100).toFixed(0)}%` : 'Pending'}</span>
									</div>
									<p><strong>Q:</strong> {pair.question ?? 'N/A'}</p>
									<p><strong>A:</strong> {pair.transcription}</p>
								</li>
							))}
						</ul>
					)}
				</div>
				<div className="dashboard-actions">
					<Link className="btn btn-ghost" to={`/interview/${session.id}`}>
						Back to Interview
					</Link>
					<Link className="btn btn-primary" to="/dashboard">
						Back to Dashboard
					</Link>
				</div>
			</section>
		</main>
	)
}
