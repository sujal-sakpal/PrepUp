
# AI Interview Platform

Full-stack AI-powered mock interview platform.

## Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: FastAPI + Python
- **Database**: MongoDB Atlas
- **LLM**: Groq (llama-3.3-70b-versatile) or Gemini (optional)
- **Audio**: Groq Whisper Large v3 Turbo

## Prerequisites

- **Python**: 3.11+
- **Node.js**: 20+

## Setup

### 1. Environment Variables

Before running the backend, copy `.env.example` to `.env` in the `backend/` folder and fill in the required values:

```bash
cp backend/.env.example backend/.env
```

**Required variables:**

- MongoDB connection: `MONGODB_URL`, `MONGODB_DB_NAME`
- JWT secrets: `JWT_SECRET`, `JWT_ALGORITHM`, etc.
- LLM API keys:
	- `GROQ_API_KEY` (get from https://console.groq.com/)
	- `GEMINI_API_KEY` (optional, for Google Gemini, get from https://makersuite.google.com/ or Google Cloud)
- Audio pipeline: `AUDIO_MODEL`, `AUDIO_FFMPEG_PATH`, etc.
- CORS: `FRONTEND_URL`

See `.env.example` for all required variables and descriptions.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

**Dependencies:**

- Backend: See `backend/requirements.txt` (up to date)
- Frontend: See `frontend/package.json` (up to date)