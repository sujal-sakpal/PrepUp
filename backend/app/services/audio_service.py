"""Audio pipeline utilities for validation and browser audio normalization."""

from __future__ import annotations

from dataclasses import dataclass
import asyncio
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import wave

from groq import APIError, APITimeoutError, Groq

from app.config import settings


class AudioProcessingError(Exception):
	"""Structured error raised by audio processing operations."""

	def __init__(
		self,
		code: str,
		message: str,
		*,
		retryable: bool = False,
		details: dict[str, str | int | float | bool | None] | None = None,
	) -> None:
		super().__init__(message)
		self.code = code
		self.retryable = retryable
		self.details = details or {}


@dataclass(slots=True)
class NormalizedAudioResult:
	"""Container for normalized audio bytes and conversion metadata."""

	wav_bytes: bytes
	duration_seconds: float
	original_size_bytes: int
	normalized_size_bytes: int
	conversion_latency_ms: int


@dataclass(slots=True)
class TranscriptionResult:
	"""Container for provider transcription result and latency metadata."""

	transcript_text: str
	provider: str
	provider_latency_ms: int


class AudioService:
	"""Service encapsulating runtime checks and ffmpeg-based normalization."""
	_resolved_ffmpeg_path: str | None = None

	def __init__(self) -> None:
		self.allowed_mime_types = {
			mime.strip().lower()
			for mime in settings.audio_allowed_mime_types.split(",")
			if mime.strip()
		}

	@classmethod
	def validate_runtime_configuration(cls) -> None:
		"""Validate required audio dependencies and configuration at startup."""
		if not settings.groq_api_key.strip():
			raise RuntimeError(
				"Missing GROQ_API_KEY. Add it to backend/.env to enable transcription."
			)

		if not settings.audio_model.strip():
			raise RuntimeError(
				"Missing AUDIO_MODEL. Set a valid Whisper model name in backend/.env."
			)

		cls._resolve_ffmpeg_path()

	@classmethod
	def _resolve_ffmpeg_path(cls) -> str:
		"""Resolve ffmpeg from env, PATH, or imageio-ffmpeg bundled binary."""
		if cls._resolved_ffmpeg_path:
			return cls._resolved_ffmpeg_path

		ffmpeg_candidate = settings.audio_ffmpeg_path.strip()

		if ffmpeg_candidate:
			if Path(ffmpeg_candidate).is_absolute():
				if Path(ffmpeg_candidate).exists():
					cls._resolved_ffmpeg_path = ffmpeg_candidate
					return ffmpeg_candidate
				raise RuntimeError(
					f"Configured AUDIO_FFMPEG_PATH does not exist: {ffmpeg_candidate}"
				)

			if shutil.which(ffmpeg_candidate) is not None:
				cls._resolved_ffmpeg_path = ffmpeg_candidate
				return ffmpeg_candidate

		try:
			from imageio_ffmpeg import get_ffmpeg_exe
		except Exception as exc:
			raise RuntimeError(
				"ffmpeg executable not found. Set AUDIO_FFMPEG_PATH or install imageio-ffmpeg."
			) from exc

		resolved_path = get_ffmpeg_exe()
		if not resolved_path or not Path(resolved_path).exists():
			raise RuntimeError(
				"imageio-ffmpeg did not provide a usable ffmpeg binary. "
				"Set AUDIO_FFMPEG_PATH to a valid executable."
			)

		cls._resolved_ffmpeg_path = resolved_path
		return resolved_path

	def ensure_audio_payload_is_valid(
		self,
		audio_bytes: bytes,
		mime_type: str,
		recorded_duration_ms: int | None,
	) -> None:
		"""Validate MIME type, payload size, and client-declared duration."""
		if not audio_bytes:
			raise AudioProcessingError(
				"INVALID_AUDIO_BYTES",
				"Audio payload is empty.",
				retryable=True,
			)

		normalized_mime_type = mime_type.strip().lower()
		if normalized_mime_type not in self.allowed_mime_types:
			raise AudioProcessingError(
				"INVALID_AUDIO_TYPE",
				"Unsupported audio MIME type.",
				retryable=True,
				details={
					"received_mime_type": normalized_mime_type,
					"allowed_mime_types": ",".join(sorted(self.allowed_mime_types)),
				},
			)

		audio_size_bytes = len(audio_bytes)
		if audio_size_bytes > settings.audio_max_upload_bytes:
			raise AudioProcessingError(
				"INVALID_AUDIO_SIZE",
				"Audio file exceeds maximum allowed size.",
				retryable=True,
				details={
					"received_size_bytes": audio_size_bytes,
					"max_size_bytes": settings.audio_max_upload_bytes,
				},
			)

		if recorded_duration_ms is not None:
			max_duration_ms = settings.audio_max_duration_seconds * 1000
			if recorded_duration_ms > max_duration_ms:
				raise AudioProcessingError(
					"INVALID_AUDIO_DURATION",
					"Audio duration exceeds the maximum allowed recording length.",
					retryable=True,
					details={
						"received_duration_ms": recorded_duration_ms,
						"max_duration_ms": max_duration_ms,
					},
				)

	def normalize_to_wav(self, audio_bytes: bytes, mime_type: str) -> NormalizedAudioResult:
		"""Convert browser audio bytes into 16 kHz mono WAV for Whisper ingestion."""
		start_time = time.perf_counter()
		ffmpeg_executable = self._resolve_ffmpeg_path()

		with tempfile.TemporaryDirectory(prefix="prepup-audio-") as temp_dir:
			temp_path = Path(temp_dir)
			input_path = temp_path / self._build_input_name(mime_type)
			output_path = temp_path / "normalized.wav"
			input_path.write_bytes(audio_bytes)

			command = [
				ffmpeg_executable,
				"-y",
				"-i",
				str(input_path),
				"-ac",
				"1",
				"-ar",
				"16000",
				"-f",
				"wav",
				str(output_path),
			]

			try:
				process = subprocess.run(
					command,
					check=False,
					capture_output=True,
					text=True,
					timeout=settings.audio_conversion_timeout_seconds,
				)
			except subprocess.TimeoutExpired as exc:
				raise AudioProcessingError(
					"AUDIO_CONVERSION_TIMEOUT",
					"Audio conversion timed out.",
					retryable=True,
					details={"timeout_seconds": settings.audio_conversion_timeout_seconds},
				) from exc

			if process.returncode != 0:
				raise AudioProcessingError(
					"AUDIO_CONVERSION_FAILED",
					"ffmpeg failed to convert the uploaded audio.",
					retryable=True,
					details={"ffmpeg_stderr": process.stderr.strip()[:800]},
				)

			if not output_path.exists() or output_path.stat().st_size == 0:
				raise AudioProcessingError(
					"AUDIO_CONVERSION_FAILED",
					"ffmpeg conversion completed without a valid output file.",
					retryable=True,
				)

			wav_bytes = output_path.read_bytes()
			duration_seconds = self._read_wav_duration_seconds(output_path)

			conversion_latency_ms = int((time.perf_counter() - start_time) * 1000)
			return NormalizedAudioResult(
				wav_bytes=wav_bytes,
				duration_seconds=duration_seconds,
				original_size_bytes=len(audio_bytes),
				normalized_size_bytes=len(wav_bytes),
				conversion_latency_ms=conversion_latency_ms,
			)

	async def transcribe_wav_with_groq(self, wav_bytes: bytes) -> TranscriptionResult:
		"""Call Groq Whisper with normalized WAV bytes and return transcript text."""
		if not wav_bytes:
			raise AudioProcessingError(
				"INVALID_AUDIO_BYTES",
				"Normalized WAV payload is empty.",
				retryable=True,
			)

		start_time = time.perf_counter()
		try:
			transcript_text = await asyncio.wait_for(
				asyncio.to_thread(self._transcribe_wav_sync, wav_bytes),
				timeout=settings.audio_provider_timeout_seconds,
			)
		except TimeoutError as exc:
			raise AudioProcessingError(
				"TRANSCRIPTION_TIMEOUT",
				"Transcription provider request timed out.",
				retryable=True,
				details={"timeout_seconds": settings.audio_provider_timeout_seconds},
			) from exc

		if not transcript_text.strip():
			raise AudioProcessingError(
				"TRANSCRIPTION_PROVIDER_FAILURE",
				"Transcription provider returned an empty response.",
				retryable=True,
			)

		provider_latency_ms = int((time.perf_counter() - start_time) * 1000)
		return TranscriptionResult(
			transcript_text=transcript_text.strip(),
			provider="groq",
			provider_latency_ms=provider_latency_ms,
		)

	@staticmethod
	def _transcribe_wav_sync(wav_bytes: bytes) -> str:
		"""Perform blocking Groq SDK call in a worker thread."""
		client = Groq(api_key=settings.groq_api_key)
		try:
			response = client.audio.transcriptions.create(
				model=settings.audio_model,
				file=("answer.wav", wav_bytes),
			)
		except APITimeoutError as exc:
			raise AudioProcessingError(
				"TRANSCRIPTION_TIMEOUT",
				"Transcription provider request timed out.",
				retryable=True,
			) from exc
		except APIError as exc:
			raise AudioProcessingError(
				"TRANSCRIPTION_PROVIDER_FAILURE",
				"Transcription provider failed to process audio.",
				retryable=True,
				details={"provider_error": str(exc)[:500]},
			) from exc
		except Exception as exc:
			raise AudioProcessingError(
				"TRANSCRIPTION_PROVIDER_FAILURE",
				"Unexpected transcription provider failure.",
				retryable=True,
				details={"provider_error": str(exc)[:500]},
			) from exc

		if isinstance(response, str):
			return response

		response_text = getattr(response, "text", None)
		if isinstance(response_text, str):
			return response_text

		return ""

	@staticmethod
	def _build_input_name(mime_type: str) -> str:
		"""Pick a best-effort extension to help ffmpeg infer browser container format."""
		if "webm" in mime_type:
			return "input.webm"
		if "wav" in mime_type:
			return "input.wav"
		if "mpeg" in mime_type:
			return "input.mp3"
		if "ogg" in mime_type:
			return "input.ogg"
		if "mp4" in mime_type:
			return "input.mp4"
		return "input.audio"

	@staticmethod
	def _read_wav_duration_seconds(wav_path: Path) -> float:
		"""Read WAV metadata and return duration in seconds."""
		with wave.open(str(wav_path), "rb") as wav_file:
			frame_count = wav_file.getnframes()
			frame_rate = wav_file.getframerate()
			if frame_rate <= 0:
				return 0.0
			return round(frame_count / frame_rate, 3)
