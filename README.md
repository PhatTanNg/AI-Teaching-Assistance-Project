# AITA — AI Teaching Assistance

An AI-powered lecture companion for students. Record or upload lectures, get real-time transcripts, auto-extract key terms with smart definitions, revise with flashcards and quizzes, build mind maps, and ask the Kiki AI tutor about your lecture content.

## Live Demo

[https://ai-teaching-assistance-project.vercel.app](https://ai-teaching-assistance-project.vercel.app)

---

## Architecture

```
Browser (React / Vercel)
        │
        ├─ REST / SSE ──► Node.js API (Render :5001)
        │                         │
        │                         ├─ MongoDB Atlas
        │                         ├─ OpenAI API  (GPT-4o-mini, Whisper)
        │                         ├─ Resend      (transactional email)
        │                         └─ /api/analyze proxy ──► Python NLP (Render :10000)
        │
        └─ WebSocket ──► /ws/realtime-proxy (Node backend)
                                  │
                                  └─ Google Cloud Speech-to-Text (streaming)
```

**Frontend** is deployed to Vercel. All `/api/*` calls are proxied to the Node backend on Render via `vercel.json` rewrites. The Python NLP service is a separate Render web service.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5, Tailwind CSS, shadcn/ui (Radix UI), React Router v7 |
| Styling | Space Grotesk / DM Sans / JetBrains Mono, next-themes dark/light mode |
| Charts & Canvas | Recharts (progress), @xyflow/react + dagre (mind map canvas) |
| Math rendering | KaTeX (katex + rehype-katex + remark-math) |
| Export | jsPDF, html-to-image, Anki CSV |
| Animation | Rive (@rive-app/react-canvas) |
| Backend | Node.js 18+ + Express 5, MongoDB + Mongoose |
| Python NLP | Flask + NLTK (POS tagging, noun extraction, Wikipedia lookup) |
| AI / Speech | OpenAI GPT-4o-mini (chat, correction, mind map, notes, summaries), Whisper (file transcription) |
| Realtime | Web Speech API (live recording), SSE (AI chat), WebSocket (Google Cloud STT) |
| Auth | JWT (access token in `localStorage`), Resend (email verification, password reset) |
| Deployment | Vercel (frontend), Render (Node + Python backends) |

---

## Features

### Transcription
- **Live Recording** — Web Speech API with 3-layer real-time display: settled text / AI-correcting (italic) / interim cursor
- **File Upload** — MP3, M4A, WAV, OGG, WebM up to 25 MB; transcribed via OpenAI Whisper
- **AI Auto-correct** — Each speech chunk is silently corrected by GPT for filler words and mishearing; toggleable with AI On/Off button
- **LaTeX rendering** — KaTeX renders inline (`$...$`) and block (`$$...$$`) math, including GPT-produced `\(...\)` and `\[...\]` notation
- **AI Correction Modal** — Full-screen before/after diff view; accept or reject GPT rewrites
- **iOS support** — MediaRecorder path for Safari/iOS where Web Speech API is unavailable

### Content Management
- **Smart Keyword Extraction** — Python NLP (NLTK POS tagging) extracts genuine educational/technical terms; GPT generates definitions in the same language as the lecture (Vietnamese or English)
- **Notes** — Auto-generated structured notes per transcript; regeneratable on demand
- **Summaries** — Auto-generated after saving; editable on the Transcripts page
- **Transcripts** — Browse, view, edit, and delete saved transcripts

### Revision
- **Flashcards** — Generate from any transcript with difficulty settings; SRS rating (Again / Good / Easy) with spaced-repetition scheduling
- **MCQ Quizzes** — Auto-generated multiple-choice questions; submit answers and receive instant feedback
- **Progress Tracking** — Per-student accuracy, streak, and session history via Recharts dashboard
- **Weak Topics** — Surface concepts the student scores poorly on across sessions
- **Export** — Download revision sets as PDF or Anki-compatible CSV

### Mind Maps
- **GPT-generated mind maps** from saved transcripts — hierarchical concept tree rendered on a @xyflow/react canvas with auto-layout via dagre
- **Interactive canvas** — Drag, zoom, select nodes, view node details
- **Library** — Save, rename, delete, and regenerate mind maps per transcript

### AI Chat — Kiki
- **Kiki 🐒** — Streaming SSE chat assistant available on every page via fixed FAB
- Context-aware: loads your current lecture transcript as context when on the Transcripts page
- Powered by GPT-4o-mini with a friendly tutor personality

### Account & UX
- **Email verification** — Resend-powered; banner prompt + one-click resend
- **Forgot / Reset password** — Token-based reset email via Resend
- **Profile** — Update display name, date of birth, change password
- **i18n** — Interface language toggle: English / Vietnamese
- **Dark / Light mode** — Persistent sidebar toggle (next-themes)
- **Onboarding modal** — First-run tutorial for new users

---

## Prerequisites

- Node.js 18+
- Python 3.8+
- npm
- MongoDB instance (local or Atlas)
- OpenAI API key
- Resend API key (for email — optional for local dev, required for email flows)
- Google Cloud credentials JSON (optional — only for WebSocket STT path)

---

## Quick Start

### 1. Backend (Node.js)

```bash
cd backend
npm install
cp .env.example .env   # fill in your values
npm run dev            # http://localhost:5001
```

**Required `.env` variables:**

```
MONGO_URI=mongodb://localhost:27017/ai-teaching-app
JWT_SECRET=your_secret
OPENAI_API_KEY=sk-...
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Optional `.env` variables:**

```
# Email (required for signup verification + password reset)
RESEND_API_KEY=re_...
EMAIL_FROM=AITA <noreply@yourdomain.com>

# Python NLP service (defaults to http://localhost:5002 in dev)
PYTHON_BACKEND_URL=http://localhost:5002

# Google Cloud Speech-to-Text (WebSocket path)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-credentials.json
```

### 2. Python NLP Backend

```bash
cd python-backend
pip install -r requirements.txt
python app.py          # http://localhost:5002
```

### 3. Frontend

```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:5001" > .env.local
npm run dev            # http://localhost:5173
```

> `.env.local` is git-ignored and takes priority over `.env` in Vite.

### One-Command Start (Windows)

```powershell
./start-all.ps1
```

Launches all three services (Node backend :5001, Python backend :5002, frontend :5173) in separate terminal windows.

---

## User Flow

1. **Sign up / Sign in** — Create an account; verify email address
2. **Record or Upload** — Go to `/transcribe`, choose *Live Recording* or *Upload File*, select lecture language (English / Vietnamese / Irish)
3. **Transcribe** — Live text appears in real time; AI corrects each chunk automatically if *AI: On* is active
4. **Review Keywords** — Python NLP + GPT-extracted keywords populate the sidebar; add extra keywords manually by double-clicking or selecting text
5. **Save** — Enter a course/subject name and click *Save lecture*. Backend auto-generates a summary, notes, and keyword definitions in the background
6. **Transcripts** — Browse, edit, and delete saved transcripts at `/transcripts`; view notes and summaries inline
7. **Keywords** — Review keyword groups per transcript at `/keywords`
8. **Revision** — Generate flashcards or MCQ quizzes at `/revision`; track accuracy, streaks, and weak topics; export to PDF or Anki
9. **Mind Map** — Generate a concept mind map from any transcript at `/mindmap`; interact with the canvas, view node details
10. **Ask Kiki** — Click the 🐒 FAB on any page to open the AI chat

---

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── controllers/         # Business logic (auth, user, content, transcribe, chat, mindmap)
│   │   ├── models/              # Mongoose schemas (User, Transcript, Summary, Keyword, Notes, MindMap, ...)
│   │   ├── routes/              # Express routers
│   │   ├── middlewares/         # JWT auth
│   │   ├── services/            # summaryService, mindmapService, notesService
│   │   ├── revision/            # Flashcard, MCQ, SRS, progress, export sub-module
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── services/        # flashcardService, mcqService, srsService, exportService, progressService
│   │   │   ├── prompts/
│   │   │   └── routes/
│   │   └── server.js            # Entry point + WebSocket + /api/analyze proxy
│   └── .env.example
├── python-backend/
│   └── app.py                   # Flask + NLTK keyword extraction → /api/analyze
├── frontend/
│   ├── src/
│   │   ├── pages/               # Transcribe, Transcripts, Keywords, RevisionModePage, MindMapPage, Home, Profile
│   │   ├── components/          # Sidebar, MonkeyChat, Mascot, OnboardingModal, mindmap/*, revision/*, ui/*
│   │   ├── context/             # AuthContext, LanguageContext, ChatContext
│   │   ├── api/                 # Typed API client (client.js)
│   │   ├── i18n/                # en.js, vi.js locale files
│   │   └── index.css            # Full design system (~2300 lines)
│   └── .env
├── render.yaml                  # Render deployment config (Node + Python services)
├── vercel.json                  # Vercel rewrites — /api/* → Render backend
└── start-all.ps1                # One-command local dev launcher (Windows)
```

---

## API Reference

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register + send verification email |
| POST | `/api/auth/signin` | Login → JWT |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET  | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/resend-verification` | Resend verification email |

### User

| Method | Path | Description |
|---|---|---|
| GET | `/api/users/me` | Current user |
| PUT | `/api/users/me` | Update display name / date of birth |
| PUT | `/api/users/me/password` | Change password |

### Transcribe

| Method | Path | Description |
|---|---|---|
| POST | `/api/transcribe/upload` | Whisper file transcription (multipart, ≤25 MB) |
| POST | `/api/transcribe/correct` | GPT text correction |
| POST | `/api/transcribe/analyze` | Extract keywords from transcript text |

### Content

| Method | Path | Description |
|---|---|---|
| POST | `/api/content/transcripts` | Save transcript (triggers summary + keywords async) |
| GET | `/api/content/transcripts` | List transcripts |
| GET | `/api/content/transcripts/:id` | Get transcript by ID |
| PUT | `/api/content/transcripts/:id` | Edit transcript text |
| DELETE | `/api/content/transcripts/:id` | Delete transcript |
| GET | `/api/content/transcripts/:id/summary` | Get summary |
| PUT | `/api/content/summaries/:id` | Edit summary text |
| GET | `/api/content/transcripts/:id/keyword-groups` | Get keyword groups |
| POST | `/api/content/keyword-groups/:id/keywords` | Add keyword |
| PUT | `/api/content/keywords/:id` | Update keyword definition |
| DELETE | `/api/content/keyword-groups/:groupId/keywords/:keywordId` | Remove keyword |
| GET | `/api/content/transcripts/:id/notes` | Get notes |
| POST | `/api/content/transcripts/:id/notes/regenerate` | Regenerate notes with GPT |

### Revision

| Method | Path | Description |
|---|---|---|
| POST | `/revision/flashcards/generate` | Generate flashcard set from transcript |
| POST | `/revision/mcq/generate` | Generate MCQ set from transcript |
| GET | `/revision/sets` | List all revision sets |
| GET | `/revision/sets/:setId` | Set metadata |
| GET | `/revision/flashcards/:setId` | Flashcards in set |
| GET | `/revision/mcq/:setId` | MCQs in set |
| POST | `/revision/flashcard/rate` | Rate flashcard (SRS) |
| POST | `/revision/mcq/submit` | Submit MCQ answers |
| GET | `/revision/progress/:studentId` | Progress stats |
| GET | `/revision/weak-topics/:studentId` | Weak topic list |
| GET | `/revision/export/pdf/:setId` | Export set as PDF |
| GET | `/revision/export/anki/:setId` | Export flashcards as Anki CSV |

### Mind Maps

| Method | Path | Description |
|---|---|---|
| POST | `/api/mindmaps/generate` | GPT-generate mind map from transcript |
| GET | `/api/mindmaps` | List mind maps |
| GET | `/api/mindmaps/:id` | Get mind map with full node data |
| PUT | `/api/mindmaps/:id` | Rename mind map |
| PUT | `/api/mindmaps/:id/overwrite` | Overwrite node layout |
| POST | `/api/mindmaps/:id/regenerate` | Regenerate mind map with GPT |
| DELETE | `/api/mindmaps/:id` | Delete mind map |

### Chat & Analysis

| Method | Path | Description |
|---|---|---|
| POST | `/api/chat/stream` | Kiki SSE chat stream (protected) |
| POST | `/api/analyze` | Proxy to Python NLP keyword service |

### WebSocket

| Path | Description |
|---|---|
| `ws://.../ws/realtime-proxy` | Google Cloud Speech-to-Text streaming (binary PCM audio → transcript events) |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Microphone not working | Ensure Chrome or Edge has microphone permission; Firefox does not support the Web Speech API |
| Keywords not appearing | Check `OPENAI_API_KEY` in backend `.env`; Python NLP service may be down (keywords fall back to empty array) |
| "Summary / Notes generating…" | Generated asynchronously after save; refresh after a few seconds |
| `transcribe.clickToEdit` shown as literal key | Vite HMR didn't reload locale module — do a hard refresh (Ctrl+Shift+R) |
| Can't record after deleting transcript | Chrome Web Speech API needs a 150ms gap between `stop()` and `start()` — already handled; if stuck, refresh the page |
| AI correction still showing old inline panel | Hard refresh (Ctrl+Shift+R) to clear Vite HMR cache |
| Verification / reset emails not arriving | Set `RESEND_API_KEY` and `EMAIL_FROM` in backend `.env`; verify your domain in the Resend dashboard |

---

## License

Released under the MIT license.
