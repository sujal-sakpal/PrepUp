import axios from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { sessionsApi } from '@/api/sessions'
import { DOMAIN_ROLE_MAP, INTERVIEW_DOMAINS, getFocusAreasForRole } from '@/constants/domains'
import { useConfigStore } from '@/store/configStore'
import type { DifficultyLevel, InterviewType } from '@/types/session.types'
import { formatLabel } from '@/utils/formatters'

import './ConfigurePage.css'

const INTERVIEW_TYPES: InterviewType[] = ['technical', 'behavioral', 'mixed', 'case_study']
const DIFFICULTIES: DifficultyLevel[] = ['easy', 'medium', 'hard', 'adaptive']

/**
 * Four-step interview configuration wizard that creates a new session.
 */
export default function ConfigurePage() {
	const navigate = useNavigate()
	const currentStep = useConfigStore((state) => state.currentStep)
	const config = useConfigStore((state) => state.config)
	const setDomain = useConfigStore((state) => state.setDomain)
	const setRole = useConfigStore((state) => state.setRole)
	const setInterviewType = useConfigStore((state) => state.setInterviewType)
	const setDifficulty = useConfigStore((state) => state.setDifficulty)
	const setQuestionCount = useConfigStore((state) => state.setQuestionCount)
	const setFocusAreas = useConfigStore((state) => state.setFocusAreas)
	const nextStep = useConfigStore((state) => state.nextStep)
	const prevStep = useConfigStore((state) => state.prevStep)
	const reset = useConfigStore((state) => state.reset)

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [stepError, setStepError] = useState<string | null>(null)

	const roleOptions = config.domain ? DOMAIN_ROLE_MAP[config.domain] ?? [] : []
	const focusAreaOptions = getFocusAreasForRole(config.role, config.domain)
	const sliderValue = Math.min(20, Math.max(5, config.question_count))
	const sliderProgress = ((sliderValue - 5) / 15) * 100

	const canProceed = (): boolean => {
		if (currentStep === 1) {
			return config.domain.trim().length > 0 && config.role.trim().length > 0
		}

		if (currentStep === 2) {
			return Boolean(config.interview_type)
		}

		if (currentStep === 3) {
			return Boolean(config.difficulty) && config.question_count >= 5 && config.question_count <= 20
		}

		return true
	}

	const handleNext = (): void => {
		if (!canProceed()) {
			setStepError('Please complete the required fields before continuing.')
			return
		}

		setStepError(null)
		nextStep()
	}

	const toggleFocusArea = (value: string): void => {
		if (config.focus_areas.includes(value)) {
			setFocusAreas(config.focus_areas.filter((item) => item !== value))
			return
		}

		setFocusAreas([...config.focus_areas, value])
	}

	const handleDomainChange = (domain: string): void => {
		setDomain(domain)
		setRole('')
		setFocusAreas([])
	}

	const handleRoleChange = (role: string): void => {
		setRole(role)
		setFocusAreas([])
	}

	const handleSubmit = async (): Promise<void> => {
		if (!canProceed()) {
			setStepError('Please review the form and complete all required fields.')
			return
		}

		try {
			setIsSubmitting(true)
			setStepError(null)

			const normalizedConfig = {
				...config,
				interview_type: config.interview_type.toLowerCase().replace(' ', '_') as InterviewType,
				difficulty: config.difficulty.toLowerCase() as DifficultyLevel,
			}

			const createdSession = await sessionsApi.createSession({ config: normalizedConfig })
			reset()
			navigate(`/dashboard?createdSession=${createdSession.id}`)
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				const responseDetail = error.response?.data?.detail
				const detail =
					typeof responseDetail === 'string'
						? responseDetail
						: Array.isArray(responseDetail)
							? responseDetail
									.map((item) => {
										if (typeof item?.msg === 'string') {
											return item.msg
										}
										return 'Validation error'
									})
									.join(', ')
							: 'Unable to create session right now. Please try again.'
				setStepError(detail)
			} else {
				setStepError('Unexpected error while creating session.')
			}
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="page page-configure">
			<section className="dashboard-card configure-card">
				<p className="eyebrow">Interview Setup</p>
				<h1>Configure Your Next Interview</h1>
				<p className="hero-copy">
					Step {currentStep} of 4: define your interview setup and create a session.
				</p>

				<div className="wizard-progress" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={currentStep}>
					{[1, 2, 3, 4].map((step) => (
						<span
							key={step}
							className={step <= currentStep ? 'wizard-step active' : 'wizard-step'}
						>
							{step}
						</span>
					))}
				</div>

				{currentStep === 1 ? (
					<div className="wizard-section">
						<label className="field-label" htmlFor="domain-select">
							Domain
						</label>
						<select
							id="domain-select"
							className="field-input"
							value={config.domain}
							onChange={(event) => {
								handleDomainChange(event.target.value)
							}}
						>
							<option value="">Select domain</option>
							{INTERVIEW_DOMAINS.map((domain) => (
								<option key={domain} value={domain}>
									{domain}
								</option>
							))}
						</select>

						<label className="field-label" htmlFor="role-select">
							Role
						</label>
						<select
							id="role-select"
							className="field-input"
							value={roleOptions.includes(config.role) ? config.role : ''}
							onChange={(event) => handleRoleChange(event.target.value)}
							disabled={roleOptions.length === 0}
						>
							<option value="">Select role</option>
							{roleOptions.map((role) => (
								<option key={role} value={role}>
									{role}
								</option>
							))}
						</select>

						<label className="field-label" htmlFor="custom-role-input">
							Or enter custom role
						</label>
						<input
							id="custom-role-input"
							className="field-input"
							type="text"
							placeholder="e.g. Staff Backend Engineer"
							value={config.role}
							onChange={(event) => handleRoleChange(event.target.value)}
						/>
					</div>
				) : null}

				{currentStep === 2 ? (
					<div className="wizard-section">
						<p className="field-label">Interview Type</p>
						<div className="choice-grid">
							{INTERVIEW_TYPES.map((type) => (
								<button
									key={type}
									type="button"
									className={`btn ${type === config.interview_type ? 'btn-primary' : 'btn-ghost'}`}
									onClick={() => setInterviewType(type)}
								>
									{formatLabel(type)}
								</button>
							))}
						</div>
					</div>
				) : null}

				{currentStep === 3 ? (
					<div className="wizard-section">
						<p className="field-label">
							Difficulty <span className="required">*</span>
						</p>
						<div className="choice-grid">
							{DIFFICULTIES.map((level) => (
								<button
									key={level}
									type="button"
									className={`btn btn-animated ${level === config.difficulty ? 'btn-primary' : 'btn-ghost'}`}
									onClick={() => setDifficulty(level)}
								>
									{formatLabel(level)}
								</button>
							))}
						</div>

						<label className="field-label" htmlFor="question-count-slider">
							Question Count: {sliderValue}
						</label>
						<div className="slider-shell">
							<input
								id="question-count-slider"
								className="field-slider"
								type="range"
								min={5}
								max={20}
								step={5}
								value={sliderValue}
								style={{
									background: `linear-gradient(90deg, #0f75e0 0%, #0f75e0 ${sliderProgress}%, #d8e7fb ${sliderProgress}%, #d8e7fb 100%)`,
								}}
								onChange={(event) => {
									const nextValue = Number.parseInt(event.target.value || '5', 10)
									if (Number.isFinite(nextValue)) {
										setQuestionCount(nextValue)
									}
								}}
							/>
							<div className="slider-ticks" aria-hidden="true">
								<span>5</span>
								<span>10</span>
								<span>15</span>
								<span>20</span>
							</div>
						</div>


						<p className="field-label">Focus Areas</p>
						<div className="choice-grid">
							{focusAreaOptions.map(
								(area) => (
									<button
										key={area}
										type="button"
										className={`btn btn-animated ${config.focus_areas.includes(area) ? 'btn-primary' : 'btn-ghost'}`}
										onClick={() => toggleFocusArea(area)}
									>
										{area}
									</button>
								)
							)}
						</div>
					</div>
				) : null}

				{currentStep === 4 ? (
					<div className="wizard-section">
						<p className="field-label">Review</p>
						<div className="dashboard-meta">
							<p>
								<strong>Domain:</strong> {config.domain}
							</p>
							<p>
								<strong>Role:</strong> {config.role}
							</p>
							<p>
								<strong>Type:</strong> {formatLabel(config.interview_type)}
							</p>
							<p>
								<strong>Difficulty:</strong> {formatLabel(config.difficulty)}
							</p>
							<p>
								<strong>Questions:</strong> {config.question_count}
							</p>
							<p>
								<strong>Focus Areas:</strong>{' '}
								{config.focus_areas.length > 0 ? config.focus_areas.join(', ') : 'None selected'}
							</p>
						</div>
					</div>
				) : null}

				{stepError ? <p className="field-error server-error">{stepError}</p> : null}

				<div className="dashboard-actions wizard-actions">
					{currentStep > 1 ? (
						<button type="button" className="btn btn-ghost" onClick={prevStep}>
							Back
						</button>
					) : null}

					{currentStep < 4 ? (
						<button type="button" className="btn btn-primary btn-animated" onClick={handleNext}>
							Continue
						</button>
					) : (
						<button
							type="button"
							className="btn btn-primary btn-animated"
							onClick={() => {
								void handleSubmit()
							}}
							disabled={isSubmitting}
						>
							{isSubmitting ? 'Creating Session...' : 'Configure Interview'}
						</button>
					)}
				</div>
			</section>
		</main>
	)
}
