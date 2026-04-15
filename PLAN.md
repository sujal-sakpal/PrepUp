# 🎯 AI Interview Platform — Complete Implementation Plan

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack Decisions](#2-technology-stack-decisions)
3. [System Architecture](#3-system-architecture)
4. [Database Design](#4-database-design)
5. [Feature Breakdown](#5-feature-breakdown)
6. [API Design](#6-api-design)
7. [Frontend Structure](#7-frontend-structure)
8. [Phase-by-Phase Build Plan](#8-phase-by-phase-build-plan)
9. [LLM Prompt Engineering Strategy](#9-llm-prompt-engineering-strategy)
10. [Audio Pipeline](#10-audio-pipeline)
11. [Analytics & Progress Tracking](#11-analytics--progress-tracking)
12. [Authentication & Security](#12-authentication--security)
13. [Deployment Plan](#13-deployment-plan)
14. [Testing Strategy](#14-testing-strategy)

---

## 1. Project Overview

### What We're Building

A full-stack AI-powered mock interview platform where users:
- Configure their interview (domain, role, difficulty, question count, type)
- Conduct a real-time interview via a Zoom-like UI where an AI interviewer asks questions
- Record audio answers that are transcribed via Whisper
- Receive dynamic follow-up questions based on their previous answers
- Get a detailed post-interview analysis report
- Track progress over time with charts comparing repeated interview sessions

### Core User Journey

```
Register/Login → Dashboard → Configure Interview → Interview Room (Zoom-like)
→ AI asks question → User records audio → Whisper transcribes → LLM evaluates
→ Dynamic next question → End of Interview → Analysis Report
→ Report saved to Dashboard → Compare with past sessions
```

---

## 2. Technology Stack Decisions

### Frontend
| Tool | Choice | Reason |
|------|--------|--------|
| Framework | React + TypeScript | Type safety, component reuse, ecosystem |
| Styling | Tailwind CSS | Utility-first, rapid UI, consistent design tokens |
| State Management | Zustand | Lightweight, no boilerplate, TypeScript-first |
| Data Fetching | TanStack Query (React Query) | Caching, loading states, background refetch |
| Charts | Recharts | Composable, React-native, good TypeScript support |
| Audio Recording | MediaRecorder API (native browser) | No dependency; works with all modern browsers |
| Real-time | WebSockets via FastAPI | For "thinking" indicators and streaming AI responses |
| Routing | React Router v6 | Standard SPA routing |
| Forms | React Hook Form + Zod | Validation, type inference from schema |
| Animation | Framer Motion | Smooth transitions for interview room |

### Backend
| Tool | Choice | Reason |
|------|--------|--------|
| Framework | FastAPI | Async-native, automatic OpenAPI docs, Python ecosystem for AI |
| Runtime | Python 3.11+ | Latest performance improvements |
| ORM/ODM | Motor (async MongoDB driver) | Non-blocking DB operations |
| Auth | JWT (python-jose) + bcrypt | Stateless, scalable auth |
| Task Queue | None initially; add Celery later if needed | Keep it simple Phase 1 |
| WebSockets | FastAPI native WebSocket support | Built-in, no extra library |

### Database: **MongoDB Atlas** ✅ (Recommended over PostgreSQL here)

**Why MongoDB over PostgreSQL for this project:**
- Interview sessions are document-shaped — each session has variable-length arrays of Q&A pairs, scores, metadata
- Analysis reports are deeply nested JSON — terrible to normalize into SQL tables
- Schema flexibility is critical since question types, domains, and evaluation rubrics differ per session type
- MongoDB Atlas free tier is generous and includes Charts (useful for your progress analytics)
- Motor (async driver) pairs perfectly with FastAPI's async model

### LLM: **`llama-3.3-70b-versatile`** via Groq ✅ (Recommended)

**Why this model:**
- Best balance of speed (Groq's LPU hardware = 500+ tokens/sec) and quality
- 128K context window — enough to hold an entire interview conversation
- Free tier on Groq: 14,400 requests/day, 500,000 tokens/minute
- Excellent instruction-following for structured JSON outputs
- Fallback: `llama-3.1-8b-instant` for cheaper/faster low-stakes calls (e.g., generating question lists)

### Audio: **OpenAI Whisper via Groq** ✅

- Groq offers Whisper Large v3 Turbo for free (limited minutes/day)
- Faster than running Whisper locally
- If limits hit: fallback to `faster-whisper` running locally on server
- Audio format: WebM (from MediaRecorder) → convert to MP3/WAV server-side via `ffmpeg`

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React/TS)                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Auth    │  │  Dashboard   │  │    Interview Room        │  │
│  │  Pages   │  │  + Charts    │  │  (Zoom-like UI)          │  │
│  └──────────┘  └──────────────┘  └──────────────────────────┘  │
│         │             │                      │                  │
│         └─────────────┼──────────────────────┘                  │
│                       │  HTTP/WebSocket                          │
└───────────────────────┼─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                    FastAPI Backend                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐│
│  │  Auth Router │  │Session Router│  │  Analysis Router       ││
│  │  /auth/*     │  │  /session/*  │  │  /analysis/*           ││
│  └──────────────┘  └──────────────┘  └────────────────────────┘│
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐│
│  │  LLM Service │  │ Audio Service│  │  Progress Service      ││
│  │  (Groq SDK)  │  │(Whisper/ffmpeg│ │  (Aggregation pipelines││
│  └──────────────┘  └──────────────┘  └────────────────────────┘│
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│  MongoDB     │ │  Groq API   │ │  ffmpeg    │
│  Atlas       │ │  (LLM +     │ │  (audio    │
│              │ │  Whisper)   │ │  convert)  │
└──────────────┘ └─────────────┘ └────────────┘
```

### WebSocket Flow (Interview Room)

```
Client                          Server
  │                               │
  │── WS Connect /ws/session/{id}─▶│
  │                               │
  │◀── {type: "question", text} ──│
  │                               │
  │── Send audio blob (binary) ──▶│
  │                               │
  │          [server: Whisper transcribes]
  │          [server: LLM evaluates + generates next Q]
  │                               │
  │◀── {type: "transcription"} ───│
  │◀── {type: "next_question"} ───│
  │  OR                           │
  │◀── {type: "interview_end"} ───│
```

---

## 4. Database Design

### Collections

#### `users`
```json
{
  "_id": "ObjectId",
  "email": "string (unique, indexed)",
  "password_hash": "string",
  "full_name": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "profile": {
    "avatar_url": "string | null",
    "target_roles": ["string"],
    "experience_level": "fresher | junior | mid | senior"
  }
}
```

#### `interview_sessions`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (indexed)",
  "status": "configured | in_progress | completed | abandoned",
  "config": {
    "domain": "string",          // e.g., "technology"
    "role": "string",            // e.g., "Backend Engineer"
    "interview_type": "technical | behavioral | mixed | case_study",
    "difficulty": "easy | medium | hard | adaptive",
    "question_count": "number",
    "focus_areas": ["string"],   // e.g., ["system design", "algorithms"]
    "language": "string"
  },
  "started_at": "datetime",
  "ended_at": "datetime | null",
  "duration_seconds": "number",
  "qa_pairs": [
    {
      "question_index": 0,
      "question": "string",
      "question_type": "technical | behavioral | followup",
      "audio_url": "string | null",
      "transcription": "string",
      "evaluation": {
        "score": 0.85,
        "strengths": ["string"],
        "weaknesses": ["string"],
        "feedback": "string",
        "keywords_mentioned": ["string"],
        "keywords_missed": ["string"]
      },
      "time_taken_seconds": "number"
    }
  ],
  "final_analysis": {
    "overall_score": 0.78,
    "category_scores": {
      "technical_accuracy": 0.80,
      "communication": 0.75,
      "problem_solving": 0.82,
      "depth_of_knowledge": 0.70,
      "confidence": 0.78
    },
    "top_strengths": ["string"],
    "improvement_areas": ["string"],
    "detailed_feedback": "string",
    "recommended_resources": ["string"],
    "hire_recommendation": "strong_hire | hire | maybe | no_hire"
  }
}
```

#### `progress_snapshots`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (indexed)",
  "session_id": "ObjectId",
  "role": "string",
  "domain": "string",
  "interview_type": "string",
  "difficulty": "string",
  "overall_score": 0.78,
  "category_scores": {},
  "completed_at": "datetime"
}
```
> This is a lightweight denormalized collection for fast chart queries — avoids scanning full session documents.

### Indexes
```
users: email (unique)
interview_sessions: user_id, status, (user_id + config.role) compound
progress_snapshots: (user_id + role), (user_id + domain), completed_at
```

---

## 5. Feature Breakdown

### Feature 1: Interview Configuration Wizard

**Step 1 — Domain & Role Selection**
- Domains: Technology, Finance, Marketing, Product Management, Data Science, Design, HR, Consulting, Sales, Operations
- Each domain has 5–10 predefined roles (user can also type custom role)
- Role cards with icons

**Step 2 — Interview Type**
- Technical (coding, system design, domain knowledge)
- Behavioral (STAR-method questions)
- Mixed (both)
- Case Study (for consulting/PM)

**Step 3 — Preferences**
- Difficulty: Easy / Medium / Hard / Adaptive (LLM adjusts based on performance)
- Question Count: 5 / 10 / 15 / Custom (3–30)
- Focus Areas: multi-select chips (e.g., "Algorithms", "System Design", "APIs")
- Time per Question: Unlimited / 2 min / 5 min

**Step 4 — Review & Start**

---

### Feature 2: Interview Room (Zoom-like UI)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [AI Interviewer Avatar - animated]   [User Camera]     │
│                                       [small box]       │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Question: "Tell me about a time you had to..."  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  [● Record]  [■ Stop & Submit]  [Skip]  [End Interview] │
│                                                         │
│  Timer: 2:34          Question 3 of 10                  │
└─────────────────────────────────────────────────────────┘
```

**AI Interviewer Avatar:**
- Animated SVG/Lottie avatar (not a real video — avoids deepfake concerns)
- Mouth animation plays when TTS speaks the question (Web Speech API for TTS, free)
- "Thinking..." animation while processing audio

**Recording Flow:**
1. User clicks Record → MediaRecorder starts → waveform visualizer shows
2. User clicks Stop → audio blob created → sent to backend via WebSocket
3. Backend returns transcription (shown to user) and next question
4. Repeat

---

### Feature 3: Dynamic Question Generation

**Logic:**
- First question: from pre-generated question pool for the role
- After each answer: LLM analyzes the answer + decides:
  - If answer is weak → easier follow-up or clarification question
  - If answer is strong → harder/deeper follow-up
  - If new topic opened → pivot to explore it
  - If question count remaining → wrap toward conclusion questions
- In "Adaptive" difficulty mode: maintains a running score, adjusts all subsequent questions

---

### Feature 4: Post-Interview Analysis

**Report Sections:**
1. **Overall Score** — large donut chart (0–100)
2. **Category Scores** — radar/spider chart (5 dimensions)
3. **Per-Question Breakdown** — expandable list with score, strengths, weaknesses per answer
4. **Top Strengths** — bullet list
5. **Improvement Areas** — bullet list with actionable suggestions
6. **Hiring Recommendation** — badge (Strong Hire / Hire / Maybe / No Hire)
7. **Recommended Resources** — links or suggestions for weak areas
8. **Full Transcript** — collapsible

---

### Feature 5: Dashboard & Progress Tracking

**Dashboard Sections:**
1. **Welcome Card** + quick stats (total sessions, average score, best role)
2. **Recent Sessions** — list with score badge, date, role, type
3. **Progress Charts** (per role):
   - Line chart: overall score over time
   - Grouped bar chart: category scores across sessions
   - Heatmap: frequency of practice (like GitHub contribution graph)
4. **Role Comparison** — if user has practiced multiple roles, radar chart comparing average scores
5. **Streak & Consistency** — days practiced streak

---

## 6. API Design

### Auth Routes `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/refresh` | Refresh JWT |
| GET | `/auth/me` | Get current user profile |
| PATCH | `/auth/me` | Update profile |

### Session Routes `/api/sessions`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Create new configured session |
| GET | `/sessions` | List user's sessions (paginated) |
| GET | `/sessions/{id}` | Get session details |
| PATCH | `/sessions/{id}/status` | Update status (abandon) |
| GET | `/sessions/{id}/analysis` | Get final analysis |
| DELETE | `/sessions/{id}` | Delete session |

### WebSocket `/ws/interview/{session_id}`

**Message types (server → client):**
```typescript
{ type: "question", text: string, index: number, total: number }
{ type: "transcription", text: string, question_index: number }
{ type: "evaluation", score: number, feedback: string, question_index: number }
{ type: "next_question", text: string, index: number }
{ type: "interview_complete", analysis: AnalysisObject }
{ type: "error", message: string }
{ type: "thinking" }  // AI is processing
```

**Message types (client → server):**
```typescript
{ type: "audio_chunk", data: Blob }  // binary audio
{ type: "skip_question" }
{ type: "end_interview" }
```

### Analysis Routes `/api/analysis`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analysis/progress?role={role}` | Get progress data for charts |
| GET | `/analysis/compare?session_ids=[...]` | Compare specific sessions |
| GET | `/analysis/summary` | Dashboard summary stats |
| GET | `/analysis/domains` | Breakdown by domain |

---

## 7. Frontend Structure

```
src/
├── api/                    # API layer
│   ├── auth.ts
│   ├── sessions.ts
│   ├── analysis.ts
│   └── client.ts           # Axios instance with interceptors
│
├── components/
│   ├── ui/                 # Reusable base components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── charts/
│   │   ├── ScoreRadar.tsx
│   │   ├── ProgressLine.tsx
│   │   ├── CategoryBar.tsx
│   │   └── HeatmapCalendar.tsx
│   ├── interview/
│   │   ├── AIAvatar.tsx
│   │   ├── AudioRecorder.tsx
│   │   ├── WaveformVisualizer.tsx
│   │   ├── QuestionCard.tsx
│   │   └── InterviewControls.tsx
│   └── layout/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       └── PageWrapper.tsx
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── configure/
│   │   └── ConfigurePage.tsx     # Multi-step wizard
│   ├── interview/
│   │   └── InterviewRoomPage.tsx
│   ├── analysis/
│   │   └── AnalysisPage.tsx
│   └── progress/
│       └── ProgressPage.tsx
│
├── hooks/
│   ├── useAudioRecorder.ts
│   ├── useWebSocket.ts
│   ├── useInterviewSession.ts
│   └── useAuth.ts
│
├── store/
│   ├── authStore.ts            # Zustand: user + JWT
│   ├── interviewStore.ts       # Zustand: active session state
│   └── configStore.ts          # Zustand: interview config wizard
│
├── types/
│   ├── auth.types.ts
│   ├── session.types.ts
│   ├── analysis.types.ts
│   └── api.types.ts
│
└── utils/
    ├── formatters.ts
    ├── validators.ts
    └── audioUtils.ts
```

### Backend Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app + CORS + router includes
│   ├── config.py               # Settings via pydantic-settings
│   ├── database.py             # Motor MongoDB connection
│   │
│   ├── routers/
│   │   ├── auth.py
│   │   ├── sessions.py
│   │   ├── analysis.py
│   │   └── websocket.py
│   │
│   ├── services/
│   │   ├── llm_service.py      # Groq LLM calls
│   │   ├── audio_service.py    # Whisper + ffmpeg
│   │   ├── session_service.py  # Session CRUD
│   │   ├── analysis_service.py # Report generation
│   │   └── auth_service.py     # JWT, password hashing
│   │
│   ├── models/
│   │   ├── user.py             # Pydantic models
│   │   ├── session.py
│   │   └── analysis.py
│   │
│   ├── middleware/
│   │   ├── auth_middleware.py
│   │   └── error_handler.py
│   │
│   └── utils/
│       ├── jwt.py
│       ├── prompts.py          # All LLM prompt templates
│       └── validators.py
│
├── tests/
├── .env
├── requirements.txt
└── Dockerfile
```

---

## 8. Phase-by-Phase Build Plan

### Phase 0: Project Setup (Day 1)

**Backend:**
```bash
# Create project
mkdir ai-interview-platform && cd ai-interview-platform
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn motor pydantic-settings python-jose bcrypt groq python-multipart
```

**Frontend:**
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install tailwindcss @tailwindcss/vite zustand @tanstack/react-query
npm install react-router-dom react-hook-form zod framer-motion recharts
```

- Setup `.env` files (GROQ_API_KEY, MONGODB_URL, JWT_SECRET)
- Setup MongoDB Atlas free cluster
- Setup project README
- Initialize Git with `.gitignore`

---

### Phase 1: Auth System (Days 2–3)

**Backend:**
- `POST /auth/register` — hash password with bcrypt, store user
- `POST /auth/login` — verify password, return JWT access + refresh tokens
- `GET /auth/me` — protected route, return user from JWT
- JWT middleware that extracts user from Bearer token

**Frontend:**
- Login page + Register page with form validation (zod schemas)
- `authStore.ts` — stores JWT + user in Zustand + localStorage
- Axios interceptor — attaches Bearer token to all requests
- Protected route wrapper component
- Auto-redirect to dashboard if already logged in

**Deliverable:** User can register, login, stay logged in after refresh

---

### Phase 2: Interview Configuration Wizard (Days 4–5)

**Backend:**
- `POST /sessions` — creates session document with status `configured`
- Domain/Role taxonomy stored as constants (not in DB — hardcoded JSON)

**Frontend:**
- 4-step wizard component with progress bar
- Step 1: Domain grid + Role selection (with icons)
- Step 2: Interview type cards
- Step 3: Sliders/toggles for difficulty, count, focus areas
- Step 4: Review summary + "Start Interview" button
- `configStore.ts` — tracks wizard state across steps
- On "Start" → POST to `/sessions` → redirect to interview room

**Deliverable:** Full wizard flow creates a session in DB

---

### Phase 3: Audio Pipeline (Days 6–7)

**Backend (`audio_service.py`):**
- Accept raw audio bytes (WebM from browser)
- Convert WebM → WAV using `ffmpeg` subprocess
- Send WAV to Groq Whisper API → get transcription text
- Return transcription

**Frontend (`useAudioRecorder.ts`):**
```typescript
// Hook encapsulates:
// - MediaRecorder API
// - Permission request
// - Recording start/stop
// - Blob creation
// - Waveform data (AnalyserNode from Web Audio API)
```

- `WaveformVisualizer.tsx` — canvas-based real-time waveform
- Test page: record → transcribe → show text

**Deliverable:** Audio recorded in browser → transcribed text returned

---

### Phase 4: LLM Question Generation (Days 8–9)

**Backend (`llm_service.py`):**

**Function 1 — Generate opening questions:**
```python
async def generate_question_set(config: InterviewConfig) -> list[str]:
    # Returns first 3 questions as seed
```

**Function 2 — Generate next question dynamically:**
```python
async def get_next_question(
    config: InterviewConfig,
    conversation_history: list[QAPair],
    current_score: float,
    questions_remaining: int
) -> str:
```

**Function 3 — Evaluate answer:**
```python
async def evaluate_answer(
    question: str,
    answer: str,
    role: str,
    domain: str
) -> AnswerEvaluation:
    # Returns score, strengths, weaknesses, keywords
```

**Function 4 — Generate final analysis:**
```python
async def generate_final_analysis(
    config: InterviewConfig,
    qa_pairs: list[QAPair]
) -> FinalAnalysis:
```

All LLM functions use structured JSON output mode (prompt specifies exact JSON schema).

**Deliverable:** LLM generates contextual questions and evaluates answers

---

### Phase 5: Interview Room WebSocket (Days 10–12)

**Backend (`websocket.py`):**
```python
@app.websocket("/ws/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    # 1. Authenticate via query param token
    # 2. Load session config from DB
    # 3. Generate first question, send to client
    # 4. Loop:
    #    a. Receive audio bytes
    #    b. Transcribe with Whisper
    #    c. Evaluate answer with LLM
    #    d. Save QA pair to DB
    #    e. If more questions: generate next, send
    #    f. If done: generate analysis, send, close
```

**Frontend (`InterviewRoomPage.tsx`):**
- `useWebSocket.ts` hook — manages WS connection, message parsing, reconnect
- `AIAvatar.tsx` — SVG avatar with CSS animation states (idle, speaking, thinking)
- Web Speech API (`speechSynthesis`) — reads question aloud
- User camera preview via `getUserMedia` (small box, no recording)
- Question card with fade-in animation
- Recording controls with countdown timer
- Transcription display (shows what AI heard after submit)

**Deliverable:** Full end-to-end interview works

---

### Phase 6: Analysis Report Page (Days 13–14)

**Frontend (`AnalysisPage.tsx`):**
- Fetch analysis from `GET /sessions/{id}/analysis`
- Overall score — large animated donut chart (Recharts `RadialBarChart`)
- Category scores — `RadarChart` (spider chart)
- Per-question accordion — each item shows Q, transcribed A, score bar, feedback
- Strengths/Weaknesses cards
- Hire recommendation badge
- "Redo this Interview" button + "Go to Dashboard" button

**Backend:**
- If analysis not yet generated (race condition) — generate on demand
- `GET /sessions/{id}/analysis` returns full analysis object

**Deliverable:** Beautiful analysis report rendered after interview

---

### Phase 7: Dashboard & Progress Tracking (Days 15–17)

**Backend (`analysis.py` router):**
```python
GET /analysis/progress?role={role}
# Returns: [{date, overall_score, category_scores}] sorted by date

GET /analysis/summary
# Returns: {total_sessions, avg_score, best_role, streak, recent_sessions}
```
Uses MongoDB aggregation pipeline.

**Frontend (`DashboardPage.tsx`):**
- Stats cards row (total sessions, avg score, streak)
- Recent sessions table with score badges
- Role selector → loads progress charts for that role
- `ProgressLine.tsx` — LineChart of overall score over time
- `CategoryBar.tsx` — grouped BarChart of category scores per session
- `HeatmapCalendar.tsx` — GitHub-style practice frequency heatmap
- If only 1 session for a role — show "Practice more to see trends" message

**Deliverable:** Full dashboard with charts comparing sessions

---

### Phase 8: Polish & Edge Cases (Days 18–20)

- Loading skeletons for all data-fetching states
- Empty states (no sessions yet, no progress yet)
- Error boundaries + fallback UI
- Audio permission denied handling
- WebSocket reconnection logic
- Session abandonment if user closes browser mid-interview
- Mobile responsive layout (interview room collapses gracefully)
- Toast notifications (react-hot-toast)
- Dark mode toggle (Tailwind `dark:` classes)

---

## 9. LLM Prompt Engineering Strategy

### System Prompt (Interviewer Persona)
```
You are Alex, a senior technical interviewer at a top tech company. 
You are conducting a {interview_type} interview for the role of {role} in {domain}.
Difficulty level: {difficulty}.

Your style:
- Professional but warm
- Ask follow-up questions based on answers
- Do not give hints unless asked
- Keep questions concise (2-3 sentences max)
- For technical questions, be specific and scenario-based

You MUST respond with valid JSON only. No markdown, no preamble.
```

### Dynamic Question Prompt Pattern
```python
"""
Interview so far:
{conversation_history}

Current overall performance score: {score}/100
Questions remaining: {remaining}

Generate the next interview question. 
Rules:
- If score < 50: ask an easier, more foundational question
- If score > 80: ask a harder, deeper question  
- If the candidate mentioned X, explore that area
- If {remaining} == 1: ask a wrap-up behavioral question
- Question type should be: {question_type}

Respond with JSON: {"question": "...", "question_type": "technical|behavioral|followup", "reasoning": "..."}
"""
```

### Answer Evaluation Prompt
```python
"""
Role: {role}
Question asked: {question}
Candidate's answer: {transcription}

Evaluate this answer on a scale of 0-100 across these dimensions:
1. Technical accuracy (for technical questions)
2. Communication clarity  
3. Depth of knowledge
4. Problem-solving approach

Respond with JSON:
{
  "score": 75,
  "technical_accuracy": 80,
  "communication": 70,
  "depth": 75,
  "problem_solving": 75,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "feedback": "One paragraph of constructive feedback",
  "keywords_mentioned": ["..."],
  "keywords_expected": ["..."]
}
"""
```

---

## 10. Audio Pipeline

```
Browser (MediaRecorder)
  → Records as audio/webm;codecs=opus
  → On stop: creates Blob
  → Sends via WebSocket as binary ArrayBuffer

Backend (Python)
  → Receives bytes
  → Writes to temp file: /tmp/{session_id}_{q_index}.webm
  → ffmpeg: webm → wav (16kHz, mono, PCM)
  → Groq Whisper API: wav → transcription text
  → Cleans up temp files
  → Returns transcription
```

**ffmpeg command:**
```bash
ffmpeg -i input.webm -ar 16000 -ac 1 -f wav output.wav
```

**Groq Whisper call:**
```python
transcription = groq_client.audio.transcriptions.create(
    file=("audio.wav", wav_bytes),
    model="whisper-large-v3-turbo",
    response_format="text",
    language="en"
)
```

---

## 11. Analytics & Progress Tracking

### MongoDB Aggregation for Progress Chart
```javascript
db.progress_snapshots.aggregate([
  { $match: { user_id: userId, role: role } },
  { $sort: { completed_at: 1 } },
  { $project: {
      date: { $dateToString: { format: "%Y-%m-%d", date: "$completed_at" } },
      overall_score: 1,
      category_scores: 1,
      session_number: 1
  }}
])
```

### Improvement Metrics
- **Score delta**: `current_score - first_score` for the role
- **Trend**: linear regression slope over last 5 sessions
- **Best session**: max score for role
- **Consistency**: standard deviation of scores (lower = more consistent)
- **Weak area improvement**: compare category scores first vs latest session

---

## 12. Authentication & Security

### JWT Strategy
- **Access token**: 15 min expiry, stored in memory (Zustand)
- **Refresh token**: 7 days expiry, stored in `httpOnly` cookie (can't be read by JS)
- On access token expiry: silent refresh via `/auth/refresh`
- On logout: clear both tokens + invalidate refresh token in DB (optional blocklist)

### Security Checklist
- [ ] Passwords hashed with bcrypt (cost factor 12)
- [ ] JWT secret minimum 256-bit random string
- [ ] CORS restricted to frontend origin only
- [ ] All session routes verify session belongs to requesting user
- [ ] WebSocket authenticates via token in query param (validated on connect)
- [ ] Audio files deleted from server after transcription
- [ ] Rate limiting on auth routes (slowapi)
- [ ] Input validation via Pydantic on all request bodies

---

## 13. Deployment Plan

### Development
```
Backend:  uvicorn app.main:app --reload --port 8000
Frontend: npm run dev  (port 5173)
Database: MongoDB Atlas free cluster
```

### Production (Budget-friendly)
| Service | Provider | Cost |
|---------|----------|------|
| Backend | Railway / Render (free tier) | Free–$5/mo |
| Frontend | Vercel | Free |
| Database | MongoDB Atlas M0 (free) | Free |
| LLM + Audio | Groq (free tier) | Free |

### Environment Variables
```env
# Backend .env
MONGODB_URL=mongodb+srv://...
JWT_SECRET=...
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
GROQ_API_KEY=...
FRONTEND_URL=http://localhost:5173

# Frontend .env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## 14. Testing Strategy

### Backend Tests (pytest + httpx)
```
tests/
├── test_auth.py          # Register, login, token refresh
├── test_sessions.py      # CRUD operations
├── test_llm_service.py   # Mock Groq API, test prompt building
├── test_audio_service.py # Mock Whisper, test ffmpeg conversion
└── test_websocket.py     # WebSocket flow end-to-end
```

### Frontend Tests (Vitest + Testing Library)
```
src/__tests__/
├── AudioRecorder.test.tsx
├── ConfigWizard.test.tsx
├── authStore.test.ts
└── useWebSocket.test.ts
```

### Manual Test Checklist (Before Each Phase Ship)
- [ ] Auth: register → login → refresh → logout cycle
- [ ] Config: complete wizard all 4 steps
- [ ] Audio: record 30s audio → transcription returns
- [ ] Interview: full 5-question session end-to-end
- [ ] Analysis: report displays correctly
- [ ] Dashboard: charts render with 2+ sessions
- [ ] Mobile: responsive layout on 375px width

---

## Appendix: Groq Model Reference

| Model | Use Case | Speed | Quality |
|-------|----------|-------|---------|
| `llama-3.3-70b-versatile` | Main interviewer + analysis | Fast | ★★★★★ |
| `llama-3.1-8b-instant` | Quick question generation | Blazing | ★★★☆☆ |
| `whisper-large-v3-turbo` | Audio transcription | Fast | ★★★★☆ |

**Recommended approach:** Use `llama-3.1-8b-instant` for generating the seed question pool (fast + cheap), and `llama-3.3-70b-versatile` for dynamic question generation and final analysis (accuracy matters).