# AI Interview Platform

Full-stack AI-powered mock interview platform.

## Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: FastAPI + Python
- **Database**: MongoDB Atlas
- **LLM**: Groq (llama-3.3-70b-versatile)
- **Audio**: Groq Whisper Large v3 Turbo

## Quick Start

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
```