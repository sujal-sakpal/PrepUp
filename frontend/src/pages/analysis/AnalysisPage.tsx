import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { llmApi } from '@/api/analysis'
import { sessionsApi } from '@/api/sessions'
import type { SessionResponse } from '@/types/session.types'

import './AnalysisPage.css'

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
			<main className="page page-analysis">
				<section className="dashboard-card">
					<p className="eyebrow">Analysis</p>
					<h1>Loading...</h1>
				</section>
			</main>
		)
	}

	if (!session) {
		return (
			<main className="page page-analysis">
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
	const latestPairs = session.qa_pairs.slice(-3)
	const overallScoreDegrees = analysis ? Math.max(0, Math.min(analysis.overall_score * 360, 360)) : 0
	const summaryCards = [
		{
			label: 'Overall Score',
			value: analysis ? `${(analysis.overall_score * 100).toFixed(0)}%` : 'Pending',
			note: analysis ? 'Interview performance' : 'Generate the report first',
		},
		{
			label: 'Recommendation',
			value: analysis ? analysis.hire_recommendation.replaceAll('_', ' ') : 'Pending',
			note: 'Hiring signal',
		},
		{
			label: 'Questions',
			value: String(session.qa_pairs.length),
			note: `${session.config.question_count} planned`,
		},
		{
			label: 'Focus Areas',
			value: String(session.config.focus_areas.length),
			note: session.config.focus_areas.length > 0 ? session.config.focus_areas.join(' · ') : 'General interview',
		},
	]

	const categoryEntries = analysis
		? [
			{ label: 'Technical', value: analysis.category_scores.technical_accuracy },
			{ label: 'Communication', value: analysis.category_scores.communication },
			{ label: 'Problem Solving', value: analysis.category_scores.problem_solving },
			{ label: 'Depth', value: analysis.category_scores.depth_of_knowledge },
			{ label: 'Confidence', value: analysis.category_scores.confidence },
		]
		: []

	const recommendedResources = analysis?.recommended_resources ?? []

	return (
		<main className="page page-analysis">
			<section className="dashboard-card analysis-card">
				<div className="analysis-hero">
					<div>
						<p className="eyebrow">Analysis</p>
						<h1>{session.config.role} Interview Report</h1>
						<p className="hero-copy">
							A compact breakdown of performance, conversation flow, and the exact areas to sharpen next.
						</p>
					</div>
					<div className="analysis-actions">
						<Link className="btn btn-ghost" to={`/interview/${session.id}`}>
							Back to Interview
						</Link>
						<Link className="btn btn-primary" to="/dashboard">
							Dashboard
						</Link>
					</div>
				</div>

				<div className="analysis-summary-grid stats-grid">
					{summaryCards.map((card) => (
						<div key={card.label} className="stat-card analysis-stat-card">
							<div className="stat-label">{card.label}</div>
							<div className="stat-value">{card.value}</div>
							<p className="analysis-card-note">{card.note}</p>
						</div>
					))}
				</div>

				{analysis ? (
					<div className="analysis-layout">
						<div className="analysis-main-column">
							<div className="analysis-panel analysis-panel--score">
								<div className="analysis-panel-head">
									<h2>Performance Breakdown</h2>
									<span>{analysis.hire_recommendation.replaceAll('_', ' ')}</span>
								</div>
								<div className="analysis-score-ring" aria-hidden="true">
									<div className="analysis-score-ring__track" />
									<div
										className="analysis-score-ring__fill"
										style={{
											background: `conic-gradient(from -90deg, #42d7ff 0deg ${overallScoreDegrees}deg, rgba(120, 138, 167, 0.22) ${overallScoreDegrees}deg 360deg)`,
										}}
									/>
									<div className="analysis-score-ring__center">
										<strong>{(analysis.overall_score * 100).toFixed(0)}%</strong>
										<span>Overall</span>
									</div>
								</div>
								<div className="analysis-bars">
									{categoryEntries.map((item) => (
										<div key={item.label} className="analysis-bar-row">
											<div className="analysis-bar-row__head">
												<strong>{item.label}</strong>
												<span>{(item.value * 100).toFixed(0)}%</span>
											</div>
											<div className="analysis-bar-track">
												<div className="analysis-bar-fill" style={{ width: `${item.value * 100}%` }} />
											</div>
										</div>
									))}
								</div>
							</div>

							<div className="analysis-panel">
								<div className="analysis-panel-head">
									<h2>Conversation Snapshot</h2>
									<span>Chat style review</span>
								</div>
								{latestPairs.length === 0 ? (
									<p className="hero-copy">No answer history is available yet.</p>
								) : (
									<div className="analysis-chat-list">
										{latestPairs.map((pair, index) => (
											<div key={`${pair.created_at}-${index}`} className="analysis-chat-turn">
												<div className="analysis-chat-bubble analysis-chat-bubble--interviewer">
													<div className="analysis-chat-bubble__meta">
														<strong>AI Interviewer</strong>
														<span>{pair.question_type}</span>
													</div>
													<p className="analysis-chat-bubble__question">{pair.question ?? 'N/A'}</p>
												</div>
												<div className="analysis-chat-bubble analysis-chat-bubble--candidate">
													<div className="analysis-chat-bubble__meta">
														<strong>You</strong>
														<span>{pair.evaluation ? `${(pair.evaluation.score * 100).toFixed(0)}%` : 'Pending'}</span>
													</div>
													<p className="analysis-chat-bubble__answer">{pair.transcription}</p>
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							<div className="analysis-panel analysis-panel--wide">
								<div className="analysis-panel-head">
									<h2>Detailed Feedback</h2>
									<span>What to improve next</span>
								</div>
								<p className="hero-copy">{analysis.detailed_feedback}</p>
							</div>
						</div>

						<div className="analysis-side-column">
							<div className="analysis-panel">
								<div className="analysis-panel-head">
									<h2>Top Strengths</h2>
									<span>What went well</span>
								</div>
								<ul className="analysis-chip-list">
									{analysis.top_strengths.map((item) => (
										<li key={item} className="analysis-chip analysis-chip--positive">{item}</li>
									))}
								</ul>
							</div>

							<div className="analysis-panel">
								<div className="analysis-panel-head">
									<h2>Improvement Areas</h2>
									<span>Gaps to close</span>
								</div>
								<ul className="analysis-chip-list">
									{analysis.improvement_areas.map((item) => (
										<li key={item} className="analysis-chip analysis-chip--warning">{item}</li>
									))}
								</ul>
							</div>

							<div className="analysis-panel">
								<div className="analysis-panel-head">
									<h2>Focus Areas</h2>
									<span>From session setup</span>
								</div>
								<div className="analysis-chip-list">
									{session.config.focus_areas.length > 0 ? (
										session.config.focus_areas.map((item) => (
											<span key={item} className="analysis-chip analysis-chip--neutral">{item}</span>
										))
									) : (
										<p className="hero-copy">No focus areas selected.</p>
									)}
								</div>
							</div>

							<div className="analysis-panel">
								<div className="analysis-panel-head">
									<h2>Recommended Next Steps</h2>
									<span>Practice targets</span>
								</div>
								{recommendedResources.length > 0 ? (
									<ul className="analysis-resource-list">
										{recommendedResources.map((item) => (
											<li key={item} className="analysis-resource-item">{item}</li>
										))}
									</ul>
								) : (
									<p className="hero-copy">No resource recommendations were generated.</p>
								)}
							</div>
						</div>
					</div>
				) : (
					<div className="analysis-panel analysis-panel--wide">
						<div className="analysis-panel-head">
							<h2>Analysis Not Generated Yet</h2>
							<span>Ready when you are</span>
						</div>
						<p className="hero-copy">Complete interview answers are available. Generate your report now.</p>
						<button className="btn btn-primary" type="button" onClick={() => void handleGenerateAnalysis()} disabled={isGenerating || session.qa_pairs.length === 0}>
							{isGenerating ? 'Generating...' : 'Generate Analysis'}
						</button>
					</div>
				)}

				<div className="analysis-panel analysis-panel--wide">
					<div className="analysis-panel-head">
						<h2>Question by Question</h2>
						<span>Full session timeline</span>
					</div>
					{session.qa_pairs.length === 0 ? (
						<p className="hero-copy">No answers captured for this session yet.</p>
					) : (
						<div className="analysis-timeline">
							{session.qa_pairs.map((pair, index) => (
								<div key={`${pair.created_at}-${index}`} className="analysis-timeline-item">
									<div className="analysis-timeline-item__index">{index + 1}</div>
									<div className="analysis-timeline-item__body">
										<div className="transcript-history-header">
											<strong>{pair.question_type}</strong>
											<span>{pair.evaluation ? `${(pair.evaluation.score * 100).toFixed(0)}%` : 'Pending'}</span>
										</div>
										<p><strong>Q:</strong> {pair.question ?? 'N/A'}</p>
										<p><strong>A:</strong> {pair.transcription}</p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</section>
		</main>
	)
}
