interface WaveformVisualizerProps {
	values: number[]
	isRecording: boolean
	isProcessing: boolean
}

/**
 * Lightweight bar waveform visualizer for microphone capture feedback.
 */
export function WaveformVisualizer({
	values,
	isRecording,
	isProcessing,
}: WaveformVisualizerProps) {
	const bars = values.length > 0 ? values : new Array(24).fill(0.08)
	const amplifiedBars = bars.map((value) => Math.min(1, Math.max(0.1, value * 2.2)))

	return (
		<div className="waveform-shell" aria-live="polite">
			<div className="waveform-bars">
				{amplifiedBars.map((value, index) => {
					const height = Math.max(8, Math.round(value * 68) + 8)
					return (
						<span
							key={`wave-bar-${index}`}
							className={`waveform-bar ${isRecording ? 'is-recording' : ''} ${isProcessing ? 'is-processing' : ''}`}
							style={{ height: `${height}px` }}
						/>
					)
				})}
			</div>
		</div>
	)
}
