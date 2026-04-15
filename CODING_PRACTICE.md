# 🏗️ AI Interview Platform — Coding Practices & Standards

> This document defines the code quality standards, patterns, and conventions for the entire codebase. Every developer (or solo builder) must follow these. The goal is a codebase that is readable, maintainable, and scalable.

---

## Table of Contents

1. [Golden Rules](#1-golden-rules)
2. [Project Configuration](#2-project-configuration)
3. [TypeScript Standards](#3-typescript-standards)
4. [React Patterns](#4-react-patterns)
5. [State Management Patterns](#5-state-management-patterns)
6. [API Layer Patterns](#6-api-layer-patterns)
7. [Custom Hooks Patterns](#7-custom-hooks-patterns)
8. [Backend Python Standards](#8-backend-python-standards)
9. [FastAPI Patterns](#9-fastapi-patterns)
10. [Service Layer Patterns](#10-service-layer-patterns)
11. [Error Handling](#11-error-handling)
12. [Testing Standards](#12-testing-standards)
13. [Git Workflow](#13-git-workflow)
14. [Environment & Config](#14-environment--config)
15. [Naming Conventions](#15-naming-conventions)
16. [Component Cookbook](#16-component-cookbook)
17. [LLM Service Cookbook](#17-llm-service-cookbook)

---

## 1. Golden Rules

These are non-negotiable:

1. **TypeScript strict mode is always on.** No `any`. No `@ts-ignore`. Figure out the type.
2. **No logic in components.** Business logic lives in hooks, services, or stores. Components only render.
3. **One concern per file.** A component file should not contain API calls, formatters, or unrelated helpers.
4. **Async/await everywhere.** No `.then()` chains. No callback hell.
5. **Explicit is better than implicit.** Name things what they are. No `data`, `result`, `item`, `obj`.
6. **Every function has a return type annotation** (backend) or inferred through Zod/strict TypeScript (frontend).
7. **Never commit secrets.** All secrets live in `.env`. `.env` is in `.gitignore`. Always.
8. **Write the sad path first.** Handle errors before writing the happy path. Error handling is not optional.
9. **Comments explain WHY, not WHAT.** If the code is unclear enough to need a "what" comment, rewrite the code.
10. **Write verbose, self-documenting code with docstrings on everything.** Every
    function, class, hook, and module gets a docstring/JSDoc comment explaining
    what it does, what its parameters mean, what it returns, and any important
    edge cases or side effects. Code should read like a well-written book — a
    new developer should understand any file without asking anyone. Prefer
    slightly more lines of clear code over clever one-liners. Name intermediate
    variables instead of chaining operations. Never sacrifice readability for
    brevity.


---

## 2. Project Configuration

### Frontend: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Frontend: ESLint (`.eslintrc.json`)
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "react-hooks/exhaustive-deps": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### Backend: `pyproject.toml` (ruff + mypy)
```toml
[tool.ruff]
line-length = 100
select = ["E", "F", "I", "N", "UP", "ANN", "ASYNC"]

[tool.mypy]
strict = true
python_version = "3.11"
```

### Backend: `requirements.txt`
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
motor==3.5.0
pydantic==2.8.0
pydantic-settings==2.4.0
python-jose[cryptography]==3.3.0
bcrypt==4.2.0
groq==0.11.0
python-multipart==0.0.12
slowapi==0.1.9
httpx==0.27.0     # for tests
pytest==8.3.0
pytest-asyncio==0.24.0
ruff==0.6.0
mypy==1.11.0
```

---

## 3. TypeScript Standards

### Always Define Types in `types/` Directory

```typescript
// ✅ Good — types/session.types.ts
export type Difficulty = 'easy' | 'medium' | 'hard' | 'adaptive';

export type InterviewType = 'technical' | 'behavioral' | 'mixed' | 'case_study';

export type SessionStatus = 'configured' | 'in_progress' | 'completed' | 'abandoned';

export interface InterviewConfig {
  domain: string;
  role: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  questionCount: number;
  focusAreas: string[];
}

export interface QAPair {
  questionIndex: number;
  question: string;
  transcription: string;
  evaluation: AnswerEvaluation | null;
  timeTakenSeconds: number;
}

export interface InterviewSession {
  id: string;
  userId: string;
  status: SessionStatus;
  config: InterviewConfig;
  qaPairs: QAPair[];
  startedAt: string;
  endedAt: string | null;
  finalAnalysis: FinalAnalysis | null;
}
```

### Use Zod for Runtime Validation at API Boundaries

```typescript
// ✅ Good — validators/session.validators.ts
import { z } from 'zod';

export const createSessionSchema = z.object({
  domain: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  interviewType: z.enum(['technical', 'behavioral', 'mixed', 'case_study']),
  difficulty: z.enum(['easy', 'medium', 'hard', 'adaptive']),
  questionCount: z.number().int().min(3).max(30),
  focusAreas: z.array(z.string()).max(10),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
// ↑ Derive TypeScript types FROM Zod schemas — single source of truth
```

### Never Use `any` — Use `unknown` + Type Guards

```typescript
// ❌ Bad
function parseWebSocketMessage(data: any) {
  return data.type;
}

// ✅ Good
interface WebSocketMessage {
  type: 'question' | 'transcription' | 'next_question' | 'interview_complete' | 'error';
}

function isWebSocketMessage(data: unknown): data is WebSocketMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof (data as Record<string, unknown>).type === 'string'
  );
}

function parseWebSocketMessage(rawData: unknown): WebSocketMessage {
  const parsed: unknown = JSON.parse(typeof rawData === 'string' ? rawData : '{}');
  if (!isWebSocketMessage(parsed)) {
    throw new Error(`Invalid WebSocket message: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}
```

---

## 4. React Patterns

### Component File Structure (Always in This Order)

```typescript
// 1. Imports — external libraries first, then internal, then types
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/Button';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

import type { QAPair } from '@/types/session.types';

// 2. Types/interfaces for this component only
interface AudioRecorderProps {
  onAudioReady: (audioBlob: Blob) => void;
  isDisabled?: boolean;
  maxDurationSeconds?: number;
}

// 3. Component (default export at bottom)
function AudioRecorder({ onAudioReady, isDisabled = false, maxDurationSeconds = 300 }: AudioRecorderProps) {
  // 3a. Hooks (state, refs, custom hooks, context) — all at top
  const [isRecording, setIsRecording] = useState(false);
  const { startRecording, stopRecording, waveformData } = useAudioRecorder();

  // 3b. Derived values
  const buttonLabel = isRecording ? 'Stop & Submit' : 'Start Recording';

  // 3c. Handlers (useCallback for handlers passed as props)
  const handleStartRecording = useCallback(async () => {
    setIsRecording(true);
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    setIsRecording(false);
    const blob = await stopRecording();
    onAudioReady(blob);
  }, [stopRecording, onAudioReady]);

  // 3d. Render
  return (
    <div className="flex flex-col items-center gap-4">
      <WaveformVisualizer data={waveformData} isActive={isRecording} />
      <Button
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        disabled={isDisabled}
        variant={isRecording ? 'destructive' : 'primary'}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

// 4. Default export at bottom
export default AudioRecorder;
```

### Separate Container and Presentational Components

```typescript
// ❌ Bad — mixed concerns in one component
function SessionList() {
  const [sessions, setSessions] = useState([]);
  
  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(setSessions);
  }, []);
  
  return <div>{sessions.map(s => <div key={s.id}>{s.config.role}</div>)}</div>;
}

// ✅ Good — separate data-fetching from rendering

// Container (smart component)
function SessionListContainer() {
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.list,
  });
  
  if (isLoading) return <SessionListSkeleton />;
  if (error) return <ErrorCard message="Failed to load sessions" />;
  if (!sessions?.length) return <EmptyState message="No interviews yet. Start one!" />;
  
  return <SessionList sessions={sessions} />;
}

// Presentational (dumb component — pure rendering, easily testable)
interface SessionListProps {
  sessions: InterviewSession[];
}

function SessionList({ sessions }: SessionListProps) {
  return (
    <ul className="space-y-3">
      {sessions.map(session => (
        <SessionCard key={session.id} session={session} />
      ))}
    </ul>
  );
}
```

### Always Memoize Expensive Renders

```typescript
// Memoize components that receive stable props but re-render due to parent
const SessionCard = memo(function SessionCard({ session }: { session: InterviewSession }) {
  return (
    // ... card rendering
  );
});

// useMemo for expensive computations
const chartData = useMemo(() => 
  transformSessionsToChartData(sessions),
  [sessions]  // only recompute when sessions changes
);
```

---

## 5. State Management Patterns

### Zustand Store Structure

```typescript
// ✅ Good — store/interviewStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import type { InterviewSession, QAPair } from '@/types/session.types';

// Define state and actions as separate interfaces
interface InterviewState {
  currentSession: InterviewSession | null;
  currentQuestionIndex: number;
  isRecording: boolean;
  isAIThinking: boolean;
  transcription: string | null;
}

interface InterviewActions {
  setCurrentSession: (session: InterviewSession) => void;
  addQAPair: (pair: QAPair) => void;
  setRecording: (recording: boolean) => void;
  setAIThinking: (thinking: boolean) => void;
  setTranscription: (text: string) => void;
  resetInterview: () => void;
}

const initialState: InterviewState = {
  currentSession: null,
  currentQuestionIndex: 0,
  isRecording: false,
  isAIThinking: false,
  transcription: null,
};

// Single export, devtools in development only
export const useInterviewStore = create<InterviewState & InterviewActions>()(
  devtools(
    (set) => ({
      ...initialState,
      
      setCurrentSession: (session) => 
        set({ currentSession: session }, false, 'setCurrentSession'),
      
      addQAPair: (pair) =>
        set(
          (state) => ({
            currentSession: state.currentSession
              ? { ...state.currentSession, qaPairs: [...state.currentSession.qaPairs, pair] }
              : null,
            currentQuestionIndex: state.currentQuestionIndex + 1,
          }),
          false,
          'addQAPair'
        ),
      
      setRecording: (isRecording) => set({ isRecording }, false, 'setRecording'),
      setAIThinking: (isAIThinking) => set({ isAIThinking }, false, 'setAIThinking'),
      setTranscription: (transcription) => set({ transcription }, false, 'setTranscription'),
      resetInterview: () => set(initialState, false, 'resetInterview'),
    }),
    { name: 'InterviewStore' }
  )
);

// Selector hooks — prevents unnecessary re-renders
export const useCurrentSession = () => useInterviewStore(s => s.currentSession);
export const useIsRecording = () => useInterviewStore(s => s.isRecording);
```

### React Query for Server State

```typescript
// ✅ Good — all query keys in a central constants file
// constants/queryKeys.ts
export const QUERY_KEYS = {
  sessions: {
    all: ['sessions'] as const,
    list: () => [...QUERY_KEYS.sessions.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.sessions.all, 'detail', id] as const,
    analysis: (id: string) => [...QUERY_KEYS.sessions.all, 'analysis', id] as const,
  },
  progress: {
    all: ['progress'] as const,
    byRole: (role: string) => [...QUERY_KEYS.progress.all, role] as const,
    summary: () => [...QUERY_KEYS.progress.all, 'summary'] as const,
  },
} as const;

// Usage in components
const { data: session } = useQuery({
  queryKey: QUERY_KEYS.sessions.detail(sessionId),
  queryFn: () => sessionsApi.getById(sessionId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## 6. API Layer Patterns

### Centralized API Client

```typescript
// api/client.ts
import axios from 'axios';

import { useAuthStore } from '@/store/authStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401, refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          setTokens(data.access_token, data.refresh_token);
          // Retry original request
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${data.access_token}`;
            return axios(error.config);
          }
        } catch {
          logout();
        }
      }
    }
    return Promise.reject(error);
  }
);
```

### API Module Pattern

```typescript
// api/sessions.ts
import { apiClient } from './client';

import type { CreateSessionInput } from '@/validators/session.validators';
import type { InterviewSession, FinalAnalysis } from '@/types/session.types';
import type { PaginatedResponse } from '@/types/api.types';

export const sessionsApi = {
  create: async (config: CreateSessionInput): Promise<InterviewSession> => {
    const { data } = await apiClient.post<InterviewSession>('/sessions', config);
    return data;
  },

  list: async (page = 1, limit = 10): Promise<PaginatedResponse<InterviewSession>> => {
    const { data } = await apiClient.get<PaginatedResponse<InterviewSession>>('/sessions', {
      params: { page, limit },
    });
    return data;
  },

  getById: async (id: string): Promise<InterviewSession> => {
    const { data } = await apiClient.get<InterviewSession>(`/sessions/${id}`);
    return data;
  },

  getAnalysis: async (id: string): Promise<FinalAnalysis> => {
    const { data } = await apiClient.get<FinalAnalysis>(`/sessions/${id}/analysis`);
    return data;
  },

  abandon: async (id: string): Promise<void> => {
    await apiClient.patch(`/sessions/${id}/status`, { status: 'abandoned' });
  },
} as const;
```

---

## 7. Custom Hooks Patterns

### Audio Recorder Hook

```typescript
// hooks/useAudioRecorder.ts
import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  waveformData: Float32Array;
  elapsedSeconds: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  resetRecording: () => void;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveformData, setWaveformData] = useState<Float32Array>(new Float32Array(0));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      audioContextRef.current?.close();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Web Audio API for waveform
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Start waveform animation
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const dataArray = new Float32Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getFloatTimeDomainData(dataArray);
        setWaveformData(dataArray);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
      
      // Setup MediaRecorder
      chunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.start(100); // collect chunks every 100ms
      setIsRecording(true);
      setElapsedSeconds(0);
      
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(new Blob([]));
        return;
      }
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        resolve(blob);
      };
      
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    });
  }, []);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setWaveformData(new Float32Array(0));
    setElapsedSeconds(0);
    setError(null);
  }, []);

  return {
    isRecording, audioBlob, waveformData, elapsedSeconds,
    startRecording, stopRecording, resetRecording, error,
  };
}
```

### WebSocket Hook

```typescript
// hooks/useInterviewWebSocket.ts
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ServerMessage } from '@/types/websocket.types';

interface UseInterviewWebSocketOptions {
  sessionId: string;
  token: string;
  onMessage: (message: ServerMessage) => void;
  onError?: (error: Event) => void;
}

export function useInterviewWebSocket({
  sessionId, token, onMessage, onError,
}: UseInterviewWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage); // avoid stale closure

  // Keep ref in sync
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws/interview/${sessionId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = (e) => onError?.(e);
    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const message = JSON.parse(event.data) as unknown;
        onMessageRef.current(message as ServerMessage);
      } catch {
        console.error('Failed to parse WebSocket message:', event.data);
      }
    };
    
    wsRef.current = ws;
  }, [sessionId, token, onError]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const sendAudio = useCallback((audioBlob: Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioBlob);
    }
  }, []);

  const sendSkip = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'skip_question' }));
    }
  }, []);

  const sendEnd = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_interview' }));
    }
  }, []);

  return { isConnected, sendAudio, sendSkip, sendEnd };
}
```

---

## 8. Backend Python Standards

### Type Everything with Pydantic

```python
# models/session.py
from datetime import datetime
from enum import StrEnum
from typing import Optional

from pydantic import BaseModel, Field
from bson import ObjectId


class Difficulty(StrEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    ADAPTIVE = "adaptive"


class InterviewType(StrEnum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    MIXED = "mixed"
    CASE_STUDY = "case_study"


class SessionStatus(StrEnum):
    CONFIGURED = "configured"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class InterviewConfig(BaseModel):
    domain: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., min_length=1, max_length=100)
    interview_type: InterviewType
    difficulty: Difficulty
    question_count: int = Field(..., ge=3, le=30)
    focus_areas: list[str] = Field(default_factory=list, max_length=10)


class AnswerEvaluation(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0)
    technical_accuracy: float = Field(..., ge=0.0, le=1.0)
    communication: float = Field(..., ge=0.0, le=1.0)
    depth: float = Field(..., ge=0.0, le=1.0)
    problem_solving: float = Field(..., ge=0.0, le=1.0)
    strengths: list[str]
    weaknesses: list[str]
    feedback: str
    keywords_mentioned: list[str]
    keywords_expected: list[str]


class QAPair(BaseModel):
    question_index: int
    question: str
    question_type: str
    audio_url: Optional[str] = None
    transcription: str
    evaluation: Optional[AnswerEvaluation] = None
    time_taken_seconds: int


# Response models (what API returns — excludes internal fields)
class SessionResponse(BaseModel):
    id: str
    status: SessionStatus
    config: InterviewConfig
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    qa_pairs: list[QAPair] = Field(default_factory=list)

    class Config:
        from_attributes = True
```

### Document All Functions

```python
# ✅ Good
async def evaluate_answer(
    question: str,
    transcription: str,
    role: str,
    domain: str,
    groq_client: AsyncGroq,
) -> AnswerEvaluation:
    """
    Evaluate a candidate's transcribed answer using the LLM.
    
    Sends the question + answer to the LLM with a structured evaluation prompt
    and parses the JSON response into an AnswerEvaluation model.
    
    Args:
        question: The interview question that was asked.
        transcription: The candidate's answer (from Whisper).
        role: Target role (e.g., "Backend Engineer").
        domain: Domain (e.g., "Technology").
        groq_client: Injected Groq async client.
    
    Returns:
        AnswerEvaluation with scores, feedback, and keyword analysis.
    
    Raises:
        LLMServiceError: If the LLM returns invalid JSON or the call fails.
    """
    prompt = build_evaluation_prompt(question, transcription, role, domain)
    
    try:
        response = await groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": EVALUATION_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            max_tokens=1000,
        )
    except Exception as e:
        raise LLMServiceError(f"Groq API call failed: {e}") from e
    
    raw = response.choices[0].message.content
    if not raw:
        raise LLMServiceError("Empty response from LLM")
    
    try:
        data = json.loads(raw)
        return AnswerEvaluation.model_validate(data)
    except (json.JSONDecodeError, ValidationError) as e:
        raise LLMServiceError(f"Failed to parse LLM response: {e}") from e
```

---

## 9. FastAPI Patterns

### Router Structure

```python
# routers/sessions.py
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_db
from app.models.session import SessionResponse, InterviewConfig
from app.models.user import UserInDB
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    config: InterviewConfig,
    current_user: UserInDB = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> SessionResponse:
    """Create a new configured interview session."""
    service = SessionService(db)
    session = await service.create_session(user_id=current_user.id, config=config)
    return session


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> SessionResponse:
    """Get a specific session. Only the owner can access it."""
    service = SessionService(db)
    session = await service.get_session(session_id=session_id, user_id=current_user.id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    return session
```

### Dependency Injection Pattern

```python
# dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from app.models.user import UserInDB
from app.utils.jwt import decode_access_token

security = HTTPBearer()


async def get_db() -> AsyncIOMotorDatabase:
    """Provides the database instance for injection."""
    return get_database()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UserInDB:
    """
    Dependency that extracts and validates the JWT, returns the current user.
    Raises HTTP 401 if token is invalid or user not found.
    """
    token = credentials.credentials
    
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    
    user = await db.users.find_one({"_id": payload["sub"]})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return UserInDB.model_validate(user)
```

---

## 10. Service Layer Patterns

```python
# services/session_service.py
from datetime import datetime, UTC

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.session import InterviewConfig, SessionResponse, SessionStatus


class SessionService:
    """
    Handles all business logic for interview sessions.
    Pure async class — no global state, fully injectable.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db
        self.collection = db.interview_sessions
    
    async def create_session(
        self, user_id: str, config: InterviewConfig
    ) -> SessionResponse:
        """Create a new session document and return it."""
        doc = {
            "user_id": ObjectId(user_id),
            "status": SessionStatus.CONFIGURED,
            "config": config.model_dump(),
            "qa_pairs": [],
            "started_at": None,
            "ended_at": None,
            "final_analysis": None,
            "created_at": datetime.now(UTC),
        }
        
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        
        return self._to_response(doc)
    
    async def get_session(
        self, session_id: str, user_id: str
    ) -> SessionResponse | None:
        """Get session by ID. Returns None if not found or not owned by user."""
        try:
            oid = ObjectId(session_id)
        except Exception:
            return None
        
        doc = await self.collection.find_one({
            "_id": oid,
            "user_id": ObjectId(user_id),  # ownership check
        })
        
        return self._to_response(doc) if doc else None
    
    @staticmethod
    def _to_response(doc: dict) -> SessionResponse:
        """Convert raw MongoDB document to response model."""
        doc["id"] = str(doc.pop("_id"))
        doc["config"]["interview_type"] = doc["config"].pop("interview_type", "technical")
        return SessionResponse.model_validate(doc)
```

---

## 11. Error Handling

### Frontend: Typed Error Handling

```typescript
// utils/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly detail?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// In API client interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const detail = error.response?.data?.detail as string | undefined;
      throw new ApiError(
        `Request failed with status ${status}`,
        status,
        detail
      );
    }
    throw error;
  }
);

// In components — handle specific errors
const { mutate: createSession } = useMutation({
  mutationFn: sessionsApi.create,
  onError: (error) => {
    if (error instanceof ApiError && error.statusCode === 422) {
      toast.error('Invalid configuration. Please check your inputs.');
    } else {
      toast.error('Failed to create session. Please try again.');
    }
  },
});
```

### Backend: Custom Exception Hierarchy

```python
# exceptions.py
class AppError(Exception):
    """Base exception for all application errors."""
    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.status_code = status_code


class NotFoundError(AppError):
    def __init__(self, resource: str) -> None:
        super().__init__(f"{resource} not found", status_code=404)


class UnauthorizedError(AppError):
    def __init__(self, detail: str = "Unauthorized") -> None:
        super().__init__(detail, status_code=401)


class LLMServiceError(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(f"LLM service error: {detail}", status_code=502)


class AudioServiceError(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(f"Audio processing error: {detail}", status_code=422)


# Global exception handler in main.py
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc), "type": type(exc).__name__},
    )
```

---

## 12. Testing Standards

### Frontend Test Pattern

```typescript
// components/__tests__/AudioRecorder.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import AudioRecorder from '@/components/interview/AudioRecorder';

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null as ((e: BlobEvent) => void) | null,
  onstop: null as (() => void) | null,
  state: 'inactive',
  stream: { getTracks: () => [{ stop: vi.fn() }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  global.MediaRecorder = vi.fn(() => mockMediaRecorder) as unknown as typeof MediaRecorder;
  
  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  } as unknown as MediaDevices;
});

describe('AudioRecorder', () => {
  it('shows start recording button initially', () => {
    const onAudioReady = vi.fn();
    render(<AudioRecorder onAudioReady={onAudioReady} />);
    
    expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
  });
  
  it('changes to stop button while recording', async () => {
    const onAudioReady = vi.fn();
    render(<AudioRecorder onAudioReady={onAudioReady} />);
    
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /stop & submit/i })).toBeInTheDocument();
    });
  });
  
  it('calls onAudioReady with blob after stopping', async () => {
    const onAudioReady = vi.fn();
    render(<AudioRecorder onAudioReady={onAudioReady} />);
    
    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));
    await waitFor(() => screen.getByRole('button', { name: /stop & submit/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop & submit/i }));
    
    // Simulate MediaRecorder stop event
    mockMediaRecorder.onstop?.();
    
    await waitFor(() => {
      expect(onAudioReady).toHaveBeenCalledWith(expect.any(Blob));
    });
  });
});
```

### Backend Test Pattern

```python
# tests/test_sessions.py
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app
from app.database import get_database


@pytest.fixture
def auth_headers(test_jwt_token: str) -> dict:
    return {"Authorization": f"Bearer {test_jwt_token}"}


@pytest.mark.asyncio
async def test_create_session_success(
    async_client: AsyncClient,
    auth_headers: dict,
    mock_db: AsyncMock,
) -> None:
    payload = {
        "domain": "Technology",
        "role": "Backend Engineer",
        "interview_type": "technical",
        "difficulty": "medium",
        "question_count": 10,
        "focus_areas": ["system design", "algorithms"],
    }
    
    response = await async_client.post("/sessions", json=payload, headers=auth_headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["config"]["role"] == "Backend Engineer"
    assert data["status"] == "configured"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_session_unauthorized(async_client: AsyncClient) -> None:
    response = await async_client.post("/sessions", json={})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_other_users_session_returns_404(
    async_client: AsyncClient,
    auth_headers: dict,
    other_users_session_id: str,
) -> None:
    """Ensure users cannot access sessions they don't own."""
    response = await async_client.get(
        f"/sessions/{other_users_session_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404
```

---

## 13. Git Workflow

### Branch Naming
```
feature/  — new features
fix/      — bug fixes
refactor/ — code restructuring
docs/     — documentation only
test/     — test additions

Examples:
  feature/audio-recorder-hook
  feature/interview-room-websocket
  fix/jwt-refresh-race-condition
  refactor/llm-service-error-handling
```

### Commit Message Format (Conventional Commits)
```
<type>(<scope>): <description>

Types: feat, fix, refactor, test, docs, chore, perf

Examples:
  feat(auth): add JWT refresh token rotation
  feat(interview): implement WebSocket audio streaming
  fix(audio): handle MediaRecorder permission denied gracefully
  refactor(llm): extract prompt templates to separate module
  test(sessions): add ownership validation test cases
  docs(readme): add local development setup guide
```

### PR Checklist (Self-Review)
```
□ Tests pass locally (npm test / pytest)
□ No TypeScript errors (npx tsc --noEmit)
□ No ESLint errors (npm run lint)
□ No Python type errors (mypy app/)
□ New env variables documented in .env.example
□ No console.log left in code
□ No hardcoded secrets or API keys
□ Mobile layout tested at 375px
```

---

## 14. Environment & Config

### Frontend `.env` files
```
.env              — committed (safe public defaults)
.env.local        — gitignored (local overrides)
.env.production   — gitignored (production values)
```

```env
# .env (committed — no secrets)
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000
VITE_APP_NAME=InterviewAI
```

### Backend Config Pattern (Pydantic Settings)

```python
# config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All configuration loaded from environment variables.
    Pydantic validates types and provides error messages for missing required vars.
    """
    
    # App
    app_name: str = "AI Interview Platform"
    debug: bool = False
    
    # Database
    mongodb_url: str
    mongodb_db_name: str = "interview_platform"
    
    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    
    # External APIs
    groq_api_key: str
    
    # CORS
    frontend_url: str = "http://localhost:5173"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Singleton — import this everywhere
settings = Settings()
```

---

## 15. Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| TS variables | camelCase | `audioBlob`, `sessionId` |
| TS constants | SCREAMING_SNAKE | `MAX_RECORDING_SECONDS` |
| TS types/interfaces | PascalCase | `InterviewSession`, `QAPair` |
| TS enums | PascalCase | `Difficulty.HARD` |
| React components | PascalCase | `AudioRecorder`, `SessionCard` |
| React hooks | camelCase prefixed with `use` | `useAudioRecorder`, `useInterviewStore` |
| API modules | camelCase + `Api` suffix | `sessionsApi`, `authApi` |
| Python variables | snake_case | `audio_blob`, `session_id` |
| Python constants | SCREAMING_SNAKE | `MAX_RETRIES` |
| Python classes | PascalCase | `SessionService`, `LLMService` |
| Python async functions | snake_case (no `async_` prefix) | `get_session`, `evaluate_answer` |
| DB collections | snake_case plural | `interview_sessions`, `progress_snapshots` |
| MongoDB fields | snake_case | `user_id`, `started_at` |
| REST endpoints | kebab-case | `/interview-sessions`, `/progress-snapshots` |
| Env variables | SCREAMING_SNAKE | `GROQ_API_KEY`, `JWT_SECRET` |

---

## 16. Component Cookbook

### Loading State Pattern

```typescript
// Always have 3 states: loading, error, success
function SessionAnalysis({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.sessions.analysis(sessionId),
    queryFn: () => sessionsApi.getAnalysis(sessionId),
  });
  
  if (isLoading) return <AnalysisSkeleton />;
  
  if (error) return (
    <ErrorCard
      title="Failed to load analysis"
      message={error instanceof ApiError ? error.detail : 'Please try again'}
      onRetry={() => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessions.analysis(sessionId) })}
    />
  );
  
  if (!data) return null; // should not happen but TypeScript needs this
  
  return <AnalysisReport analysis={data} />;
}
```

### Form Pattern with React Hook Form + Zod

```typescript
// pages/configure/Step3Preferences.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const step3Schema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard', 'adaptive']),
  questionCount: z.number().int().min(3).max(30),
  focusAreas: z.array(z.string()).min(1, 'Select at least one focus area'),
});

type Step3Data = z.infer<typeof step3Schema>;

function Step3Preferences({ onNext }: { onNext: (data: Step3Data) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: { difficulty: 'medium', questionCount: 10, focusAreas: [] },
  });
  
  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      {/* form fields */}
      {errors.focusAreas && (
        <p className="text-red-500 text-sm">{errors.focusAreas.message}</p>
      )}
      <button type="submit">Next</button>
    </form>
  );
}
```

---

## 17. LLM Service Cookbook

### Always Use Structured Output + Validation

```python
# services/llm_service.py
import json
from groq import AsyncGroq
from pydantic import ValidationError

from app.config import settings
from app.exceptions import LLMServiceError
from app.models.session import AnswerEvaluation, InterviewConfig
from app.utils.prompts import (
    INTERVIEWER_SYSTEM_PROMPT,
    build_evaluation_prompt,
    build_next_question_prompt,
)


class LLMService:
    def __init__(self) -> None:
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.primary_model = "llama-3.3-70b-versatile"
        self.fast_model = "llama-3.1-8b-instant"
    
    async def _call(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        max_tokens: int = 1000,
    ) -> str:
        """Base LLM call with error handling."""
        try:
            response = await self.client.chat.completions.create(
                model=model or self.primary_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                max_tokens=max_tokens,
                temperature=0.7,
            )
        except Exception as e:
            raise LLMServiceError(f"Groq API call failed: {e}") from e
        
        content = response.choices[0].message.content
        if not content:
            raise LLMServiceError("LLM returned empty response")
        
        return content
    
    async def evaluate_answer(
        self, question: str, transcription: str, config: InterviewConfig
    ) -> AnswerEvaluation:
        """Evaluate answer and return structured evaluation."""
        raw = await self._call(
            system_prompt=INTERVIEWER_SYSTEM_PROMPT.format(
                role=config.role,
                domain=config.domain,
                interview_type=config.interview_type,
            ),
            user_prompt=build_evaluation_prompt(question, transcription, config.role),
        )
        
        try:
            data = json.loads(raw)
            return AnswerEvaluation.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as e:
            raise LLMServiceError(f"Invalid evaluation response: {e}. Raw: {raw[:200]}") from e
    
    async def get_next_question(
        self,
        config: InterviewConfig,
        conversation_history: list[dict],
        current_score: float,
        questions_remaining: int,
    ) -> str:
        """Generate contextually appropriate next question."""
        raw = await self._call(
            system_prompt=INTERVIEWER_SYSTEM_PROMPT.format(
                role=config.role,
                domain=config.domain,
                interview_type=config.interview_type,
            ),
            user_prompt=build_next_question_prompt(
                conversation_history, current_score, questions_remaining, config
            ),
            model=self.primary_model,
        )
        
        try:
            data = json.loads(raw)
            question = data.get("question")
            if not isinstance(question, str) or not question.strip():
                raise LLMServiceError("Question field missing or empty in LLM response")
            return question.strip()
        except json.JSONDecodeError as e:
            raise LLMServiceError(f"Invalid JSON from LLM: {e}") from e
```

---

## 18. Verbose Code & Docstring Standards

### The Core Philosophy

Clever code that needs a comment to explain what it does is worse than
simple code that explains itself. This codebase prioritizes:

- **Verbosity over brevity** — more lines of readable code beats fewer lines
  of cryptic code every single time
- **Explicit over implicit** — never rely on the reader inferring what something
  does from context alone
- **Every public surface is documented** — if another file can import it,
  it has a docstring

---

### Python Docstring Standard (Google Style)

Every function, class, and module in the backend gets a Google-style docstring.
No exceptions.

#### Module-level docstring
```python
"""
services/llm_service.py

Handles all communication with the Groq LLM API.

This module provides the LLMService class which encapsulates:
  - Generating interview questions based on session config
  - Dynamically selecting the next question based on conversation history
  - Evaluating candidate answers and producing structured scores
  - Generating the final post-interview analysis report

All methods are async and use the Groq Python SDK. Structured JSON output
mode is used for all calls that require parsed responses, with Pydantic
validation as the final safety net.

Typical usage:
    service = LLMService()
    question = await service.get_next_question(config, history, score, remaining)
"""
```

#### Function docstring
```python
async def evaluate_answer(
    self,
    question: str,
    transcription: str,
    config: InterviewConfig,
) -> AnswerEvaluation:
    """Evaluate a candidate's transcribed answer using the primary LLM.

    Sends the question and the candidate's answer to the LLM with a
    structured evaluation prompt. The LLM is instructed to respond with
    a JSON object that is then validated against the AnswerEvaluation
    Pydantic model.

    The evaluation covers five dimensions:
      - Technical accuracy: correctness of facts, concepts, and approaches
      - Communication: clarity, structure, and coherence of the answer
      - Depth: how thoroughly the candidate explored the topic
      - Problem solving: whether the candidate demonstrated a clear thought
        process for approaching the problem
      - Overall score: weighted average of the above dimensions

    Args:
        question: The exact interview question that was asked to the
            candidate. Used as context for the LLM evaluator.
        transcription: The raw transcribed text of the candidate's spoken
            answer, produced by Whisper. May contain minor transcription
            errors which the LLM is instructed to tolerate.
        config: The full interview session config, used to provide the LLM
            with the target role, domain, and difficulty so scores are
            calibrated appropriately (e.g., a "medium" answer for a junior
            role might score differently than for a senior role).

    Returns:
        An AnswerEvaluation instance with numeric scores (0.0–1.0) for
        each dimension, lists of specific strengths and weaknesses
        identified, free-text feedback, and keyword analysis.

    Raises:
        LLMServiceError: If the Groq API call fails for any reason
            (network error, rate limit, invalid API key), or if the
            LLM returns a response that cannot be parsed into a valid
            AnswerEvaluation model.

    Example:
        evaluation = await llm_service.evaluate_answer(
            question="Explain the difference between SQL and NoSQL databases.",
            transcription="SQL databases are relational and use structured...",
            config=session.config,
        )
        print(evaluation.overall_score)  # 0.82
    """
```

#### Class docstring
```python
class SessionService:
    """Business logic layer for interview session management.

    Handles all CRUD operations for interview sessions in MongoDB,
    enforcing ownership rules (users can only access their own sessions),
    converting raw MongoDB documents to typed Pydantic response models,
    and maintaining session state transitions.

    Valid session state transitions:
        configured → in_progress → completed
        configured → abandoned
        in_progress → abandoned

    This class is intentionally stateless — all state lives in MongoDB.
    It is safe to instantiate per-request inside FastAPI route handlers.

    Attributes:
        db: The async Motor database instance injected at construction.
        collection: Direct reference to the interview_sessions collection.

    Example:
        service = SessionService(db)
        session = await service.create_session(user_id="abc123", config=config)
        print(session.status)  # "configured"
    """

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        """Initialise the service with a database connection.

        Args:
            db: An async Motor database instance. In production this is
                provided via FastAPI dependency injection (get_db).
                In tests, pass a mock or test database instance.
        """
        self.db = db
        self.collection = db.interview_sessions
```

---

### TypeScript / React JSDoc Standard

Every exported function, hook, component, type, and API module method
gets a JSDoc block. Internal helper functions inside a module also get
a one-liner comment minimum.

#### Component JSDoc
```typescript
/**
 * AudioRecorder component.
 *
 * Renders the recording UI for the interview room. Manages the full
 * recording lifecycle: requesting microphone permission, capturing
 * audio via the MediaRecorder API, displaying a live waveform, and
 * calling the onAudioReady callback with the finished Blob.
 *
 * The component does NOT handle sending the audio to the server — that
 * responsibility belongs to the parent InterviewRoomPage via the
 * onAudioReady callback. This keeps the component focused and testable.
 *
 * @param onAudioReady - Called when the user stops recording. Receives
 *   the complete audio Blob (audio/webm;codecs=opus) ready to send via
 *   WebSocket. Will not be called if the user stops before 1 second of
 *   audio has been captured.
 * @param isDisabled - When true, both the start and stop buttons are
 *   disabled. Use this while the AI is thinking or speaking to prevent
 *   the user from recording over the question.
 * @param maxDurationSeconds - Hard cap on recording length. When
 *   elapsed time reaches this value, recording stops automatically and
 *   onAudioReady is called. Defaults to 300 (5 minutes).
 *
 * @example
 * <AudioRecorder
 *   onAudioReady={(blob) => sendAudio(blob)}
 *   isDisabled={isAIThinking}
 *   maxDurationSeconds={120}
 * />
 */
function AudioRecorder({ onAudioReady, isDisabled = false, maxDurationSeconds = 300 }: AudioRecorderProps) {
```

#### Custom hook JSDoc
```typescript
/**
 * useAudioRecorder — manages the full browser audio recording lifecycle.
 *
 * Wraps the MediaRecorder API and the Web Audio API into a clean,
 * reusable interface. Handles permission requests, chunk collection,
 * waveform data for visualisation, and elapsed time tracking.
 *
 * The hook cleans up all resources (AudioContext, animation frames,
 * timers, media tracks) automatically on unmount, so callers do not
 * need to manage teardown themselves.
 *
 * @returns An object containing:
 *   - `isRecording` — whether recording is currently active
 *   - `audioBlob` — the completed Blob after stopRecording(), null before
 *   - `waveformData` — Float32Array of current amplitude values, updated
 *     at ~60fps while recording, for use in a canvas waveform visualiser
 *   - `elapsedSeconds` — integer seconds elapsed since recording started
 *   - `startRecording` — async function that requests mic permission and
 *     starts recording; throws if permission is denied
 *   - `stopRecording` — async function that stops recording and returns
 *     the final Blob; also sets the audioBlob state
 *   - `resetRecording` — clears audioBlob, waveform, timer, and error
 *     back to initial state without stopping an active recording
 *   - `error` — string error message if mic permission was denied or
 *     MediaRecorder failed; null if no error
 *
 * @example
 * const { isRecording, startRecording, stopRecording, waveformData } = useAudioRecorder()
 *
 * // Start when user clicks record
 * await startRecording()
 *
 * // Stop and get the blob when user clicks submit
 * const blob = await stopRecording()
 * sendToServer(blob)
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
```

#### API module method JSDoc
```typescript
/**
 * Creates a new configured interview session on the server.
 *
 * Posts the interview configuration to the backend which validates it,
 * creates a session document in MongoDB with status "configured", and
 * returns the full session object. The returned session ID should be
 * passed to the interview room route.
 *
 * @param config - The complete interview configuration chosen by the
 *   user in the wizard. All fields are required; validation is enforced
 *   both client-side (Zod) and server-side (Pydantic).
 * @returns The newly created InterviewSession with status "configured"
 *   and an empty qaPairs array.
 * @throws ApiError with status 422 if the config fails server-side
 *   validation (e.g., questionCount out of range).
 * @throws ApiError with status 401 if the user's JWT has expired.
 *
 * @example
 * const session = await sessionsApi.create({
 *   domain: 'technology',
 *   role: 'Backend Engineer',
 *   interviewType: 'technical',
 *   difficulty: 'medium',
 *   questionCount: 10,
 *   focusAreas: ['system design', 'algorithms'],
 * })
 * navigate(`/interview/${session.id}`)
 */
create: async (config: CreateSessionInput): Promise<InterviewSession> => {
```

#### Zustand store JSDoc
```typescript
/**
 * useInterviewStore — global state for the active interview session.
 *
 * Holds all runtime state for an in-progress interview: the session
 * object, the current question index, recording state, AI thinking
 * state, and the latest transcription. This store is the single source
 * of truth shared between InterviewRoomPage, AudioRecorder, AIAvatar,
 * and QuestionCard.
 *
 * State is reset via resetInterview() when the user leaves the room,
 * so stale data never leaks into a new session.
 *
 * Prefer the individual selector hooks (useCurrentSession, useIsRecording)
 * over selecting directly from this store — selectors prevent unnecessary
 * re-renders by subscribing only to the slice of state each component needs.
 */
```

---

### Verbose Code Rules (What This Looks Like in Practice)

#### Name every intermediate step — never chain blindly

```python
# ❌ Too clever — what does this produce? why?
result = sorted(filter(lambda x: x['score'] > 0.5, qa_pairs), key=lambda x: x['score'])[:3]

# ✅ Verbose and clear — each step is named and obvious
passing_pairs = [pair for pair in qa_pairs if pair['score'] > 0.5]
sorted_by_score = sorted(passing_pairs, key=lambda pair: pair['score'], reverse=True)
top_three_pairs = sorted_by_score[:3]
```

```typescript
// ❌ Too chained — hard to debug, hard to read
const chartData = sessions.filter(s => s.status === 'completed').map(s => ({ date: s.endedAt, score: s.finalAnalysis?.overallScore ?? 0 })).sort((a, b) => a.date.localeCompare(b.date))

// ✅ Verbose and debuggable — each transformation is a named variable
const completedSessions = sessions.filter(s => s.status === 'completed')

const chartPoints = completedSessions.map(session => ({
  date: session.endedAt ?? '',
  score: session.finalAnalysis?.overallScore ?? 0,
}))

const chartData = chartPoints.sort((a, b) => a.date.localeCompare(b.date))
```

#### Explain non-obvious constants with inline comments

```python
# 16kHz mono is the exact format Whisper expects — do not change without
# updating the Groq Whisper API call to match
WHISPER_SAMPLE_RATE = 16_000
WHISPER_CHANNELS = 1

# Groq's free tier allows 14,400 requests/day across all models combined.
# We use the fast 8B model for seed question generation to preserve the
# daily quota for the more expensive 70B model used during live interviews.
SEED_QUESTION_MODEL = "llama-3.1-8b-instant"
INTERVIEW_MODEL     = "llama-3.3-70b-versatile"
```

#### Add a comment block at the top of every non-trivial function body

```python
async def run_interview_turn(
    self,
    session_id: str,
    audio_bytes: bytes,
    question_index: int,
) -> InterviewTurnResult:
    """...(docstring above)..."""

    # Step 1: Transcribe the candidate's audio answer using Whisper.
    # The audio arrives as raw WebM bytes from the browser and must be
    # converted to WAV before Whisper will accept it.
    transcription = await self.audio_service.transcribe(audio_bytes)

    # Step 2: Load the current question from the session so the LLM
    # has the exact question text to evaluate the answer against.
    session = await self.session_service.get_session(session_id)
    current_question = session.qa_pairs[question_index].question

    # Step 3: Evaluate the answer. This is the most expensive LLM call
    # (uses the 70B model) so we do it once and store the result.
    evaluation = await self.llm_service.evaluate_answer(
        question=current_question,
        transcription=transcription,
        config=session.config,
    )

    # Step 4: Persist the transcription and evaluation to the database
    # before generating the next question. This ensures the data is
    # never lost even if the next-question call fails.
    await self.session_service.save_qa_pair(
        session_id=session_id,
        question_index=question_index,
        transcription=transcription,
        evaluation=evaluation,
    )

    # Step 5: Determine whether to continue or end the interview.
    questions_remaining = session.config.question_count - question_index - 1
    is_last_question = questions_remaining == 0

    if is_last_question:
        return InterviewTurnResult(is_complete=True, next_question=None)

    # Step 6: Generate the next question dynamically, informed by the
    # full conversation history and the running score so far.
    running_score = self._calculate_running_score(session.qa_pairs)
    next_question = await self.llm_service.get_next_question(
        config=session.config,
        conversation_history=session.qa_pairs,
        current_score=running_score,
        questions_remaining=questions_remaining,
    )

    return InterviewTurnResult(is_complete=False, next_question=next_question)
```

---

*This document is a living guide. Update it as patterns evolve or new decisions are made. If you find yourself doing something repeatedly that isn't covered here, add it.*