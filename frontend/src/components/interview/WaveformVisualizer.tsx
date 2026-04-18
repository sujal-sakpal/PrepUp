import { useEffect, useMemo, useState } from 'react'

interface WaveformVisualizerProps {
	values: number[]
	isRecording: boolean
	isProcessing: boolean
	isSpeaking: boolean
	label: string
	variant: 'ai' | 'user'
}

/**
 * Lightweight bar waveform visualizer for microphone capture feedback.
 */
export function WaveformVisualizer({
	values,
	isRecording,
	isProcessing,
	isSpeaking,
	label,
	variant,
}: WaveformVisualizerProps) {
	const [syntheticIntensity, setSyntheticIntensity] = useState(0)

	useEffect(() => {
		if (!isSpeaking) {
			setSyntheticIntensity(0)
			return
		}

		let frameId = 0
		const tick = () => {
			const pulse = (Math.sin(Date.now() / 140) + 1) / 2
			setSyntheticIntensity(pulse)
			frameId = window.requestAnimationFrame(tick)
		}

		frameId = window.requestAnimationFrame(tick)

		return () => {
			window.cancelAnimationFrame(frameId)
		}
	}, [isSpeaking])

	const normalizedAverage = useMemo(() => {
		if (values.length === 0) {
			return 0
		}

		const sum = values.reduce((acc, value) => acc + value, 0)
		return Math.min(1, Math.max(0, sum / values.length))
	}, [values])

	const effectiveIntensity =
		normalizedAverage > 0.02 ? normalizedAverage : isSpeaking || isProcessing ? syntheticIntensity : 0
	const auraScale = 1 + effectiveIntensity * 0.7
	const auraBlurPx = 18 + effectiveIntensity * 26
	const auraOpacity = 0.42 + effectiveIntensity * 0.42
	const stateClass = isRecording ? 'is-recording' : isProcessing ? 'is-processing' : ''

	return (
		<div className={`wave-aura-shell ${variant} ${isSpeaking ? 'is-speaking' : ''}`} aria-live="polite">
			<div className={`wave-aura ${stateClass}`}>
				<span
					className="wave-aura-glow"
					style={{
						transform: `translate(-50%, -50%) scale(${auraScale.toFixed(3)})`,
						filter: `blur(${auraBlurPx.toFixed(1)}px)`,
						opacity: Number(auraOpacity.toFixed(3)),
					}}
				/>
				<div className={`wave-aura-center ${variant}`}>
					<span>{variant === 'ai' ? 'AI' : 'YOU'}</span>
				</div>
			</div>
			<p className="wave-aura-label">{label}</p>
		</div>
	)
}
