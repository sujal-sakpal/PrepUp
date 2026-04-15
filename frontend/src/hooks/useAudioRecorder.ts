import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderErrorCode =
	| 'permission_denied'
	| 'device_unavailable'
	| 'unsupported'
	| 'recording_failed'

export interface RecorderErrorState {
	code: RecorderErrorCode
	message: string
}

export interface UseAudioRecorderResult {
	isRecording: boolean
	elapsedMs: number
	audioBlob: Blob | null
	waveformData: number[]
	error: RecorderErrorState | null
	startRecording: () => Promise<void>
	stopRecording: () => Promise<Blob | null>
	resetRecording: () => void
}

/**
 * Browser audio recorder hook with waveform sampling for interview UX.
 */
export function useAudioRecorder(): UseAudioRecorderResult {
	const [isRecording, setIsRecording] = useState(false)
	const [elapsedMs, setElapsedMs] = useState(0)
	const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
	const [waveformData, setWaveformData] = useState<number[]>([])
	const [error, setError] = useState<RecorderErrorState | null>(null)

	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const mediaStreamRef = useRef<MediaStream | null>(null)
	const audioContextRef = useRef<AudioContext | null>(null)
	const analyserRef = useRef<AnalyserNode | null>(null)
	const recordingStartRef = useRef<number | null>(null)
	const chunksRef = useRef<BlobPart[]>([])
	const elapsedIntervalRef = useRef<number | null>(null)
	const waveformFrameRef = useRef<number | null>(null)

	const stopTimers = useCallback(() => {
		if (elapsedIntervalRef.current !== null) {
			window.clearInterval(elapsedIntervalRef.current)
			elapsedIntervalRef.current = null
		}
		if (waveformFrameRef.current !== null) {
			window.cancelAnimationFrame(waveformFrameRef.current)
			waveformFrameRef.current = null
		}
	}, [])

	const cleanupMediaResources = useCallback(() => {
		stopTimers()

		mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
		mediaStreamRef.current = null

		analyserRef.current = null

		if (audioContextRef.current) {
			void audioContextRef.current.close()
			audioContextRef.current = null
		}
	}, [stopTimers])

	const startWaveformLoop = useCallback(() => {
		const analyser = analyserRef.current
		if (!analyser) {
			return
		}

		const buffer = new Uint8Array(analyser.fftSize)

		const frame = () => {
			analyser.getByteTimeDomainData(buffer)
			const buckets = 32
			const bucketSize = Math.floor(buffer.length / buckets)
			const nextWaveform: number[] = []

			for (let index = 0; index < buckets; index += 1) {
				let sum = 0
				const start = index * bucketSize
				for (let cursor = start; cursor < start + bucketSize; cursor += 1) {
					const normalized = (buffer[cursor] - 128) / 128
					sum += Math.abs(normalized)
				}
				nextWaveform.push(Math.min(1, sum / bucketSize))
			}

			setWaveformData(nextWaveform)
			waveformFrameRef.current = window.requestAnimationFrame(frame)
		}

		waveformFrameRef.current = window.requestAnimationFrame(frame)
	}, [])

	const startRecording = useCallback(async () => {
		setError(null)
		setAudioBlob(null)
		setElapsedMs(0)
		setWaveformData([])

		if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
			setError({
				code: 'unsupported',
				message: 'Audio recording is not supported in this browser.',
			})
			return
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			mediaStreamRef.current = stream

			const audioContext = new AudioContext()
			audioContextRef.current = audioContext
			const source = audioContext.createMediaStreamSource(stream)
			const analyser = audioContext.createAnalyser()
			analyser.fftSize = 1024
			source.connect(analyser)
			analyserRef.current = analyser

			const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
			mediaRecorderRef.current = recorder
			chunksRef.current = []

			recorder.addEventListener('dataavailable', (event) => {
				if (event.data.size > 0) {
					chunksRef.current.push(event.data)
				}
			})

			recorder.start(250)
			recordingStartRef.current = Date.now()
			setIsRecording(true)

			elapsedIntervalRef.current = window.setInterval(() => {
				const start = recordingStartRef.current
				if (start !== null) {
					setElapsedMs(Date.now() - start)
				}
			}, 150)

			startWaveformLoop()
		} catch (caughtError) {
			const typedError = caughtError as DOMException
			if (typedError.name === 'NotAllowedError') {
				setError({
					code: 'permission_denied',
					message: 'Microphone permission was denied. Please allow microphone access.',
				})
			} else {
				setError({
					code: 'device_unavailable',
					message: 'Unable to access microphone input on this device.',
				})
			}
			cleanupMediaResources()
		}
	}, [cleanupMediaResources, startWaveformLoop])

	const stopRecording = useCallback(async () => {
		const recorder = mediaRecorderRef.current
		if (!recorder || recorder.state === 'inactive') {
			return audioBlob
		}

		return await new Promise<Blob | null>((resolve) => {
			recorder.addEventListener(
				'stop',
				() => {
					const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
					setAudioBlob(blob)
					setIsRecording(false)
					stopTimers()
					cleanupMediaResources()
					resolve(blob)
				},
				{ once: true },
			)

			try {
				recorder.stop()
			} catch {
				setError({
					code: 'recording_failed',
					message: 'Failed to stop recording cleanly. Please try again.',
				})
				setIsRecording(false)
				cleanupMediaResources()
				resolve(null)
			}
		})
	}, [audioBlob, cleanupMediaResources, stopTimers])

	const resetRecording = useCallback(() => {
		setAudioBlob(null)
		setElapsedMs(0)
		setWaveformData([])
		setError(null)
	}, [])

	useEffect(() => {
		return () => {
			cleanupMediaResources()
		}
	}, [cleanupMediaResources])

	return {
		isRecording,
		elapsedMs,
		audioBlob,
		waveformData,
		error,
		startRecording,
		stopRecording,
		resetRecording,
	}
}
