# AITA — AI Teaching Assistance

An AI-powered lecture companion for students. Record or upload lectures, get real-time transcripts, auto-extract key terms with smart definitions, revise with flashcards and quizzes, and ask the Kiki AI tutor about your lecture content.

## Live Demo
- [Hosted Web App](https://ai-teaching-assistance-project.vercel.app/)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5, Tailwind CSS, shadcn/ui, React Router v7 |
| Backend | Node.js + Express, MongoDB + Mongoose |
| AI / Speech | OpenAI GPT-4o-mini (chat, correction), GPT-3.5-turbo (keywords, definitions, summaries), Whisper (file transcription) |
| Auth | JWT (access token in `localStorage`) |
| Realtime | Web Speech API (live recording), SSE (AI chat streaming) |

---

## Features

- **Live Recording** — Capture speech via Web Speech API with real-time 3-layer display (settled text / AI-correcting / interim cursor)
- **File Upload** — Upload MP3, M4A, WAV, OGG, or WebM files (up to 25 MB); transcribed via OpenAI Whisper
- **AI Auto-correct** — Each speech chunk is silently corrected by GPT for filler words and mishearing
- **Smart Keyword Extraction** — GPT extracts only genuine educational/technical terms (not common words); definitions generated in the same language as the lecture (Vietnamese or English)
- **Summaries** — Auto-generated after saving; editable on the Transcripts page
- **Revision Mode** — Generate flashcards and MCQ quizzes from saved transcripts with difficulty settings
- **Kiki AI Chat** — Streaming chat assistant (🐒) with lecture context awareness; available on every page via FAB
- **i18n** — Interface language toggle between English and Vietnamese
- **Profile** — Display name, date of birth, password change
- **Dark / Light mode** — Persistent theme toggle in the sidebar

---

## Prerequisites

- Node.js 18+
- npm
- MongoDB instance (local or Atlas)
- OpenAI API key

---

## Quick Start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in your values
npm run dev            # runs on http://localhost:5001
```

**Required `.env` variables:**
```
MONGODB_URI=mongodb://...
JWT_SECRET=your_secret
OPENAI_API_KEY=sk-...
```

### 2. Frontend

```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:5001" > .env.local
npm run dev            # runs on http://localhost:5173
```

> `.env.local` is git-ignored and takes priority over `.env` in Vite.

### One-Command Start (Windows)

```powershell
./start-all.ps1
```

---

## User Flow

1. **Record or Upload** — Go to `/transcribe`, choose *Live Recording* or *Upload File*, select lecture language (English / Vietnamese)
2. **Transcribe** — Live text appears in real time; AI corrects each chunk automatically if *AI Auto-correct* is enabled
3. **Review Keywords** — GPT-extracted keywords populate the sidebar automatically; add extra keywords manually by double-clicking or selecting text
4. **Save** — Enter a course/subject name and click *Save lecture*. The backend auto-generates a summary and keyword definitions in the background
5. **Transcripts** — Browse, view, and edit saved transcripts and summaries at `/transcripts`
6. **Keywords** — Review keyword groups per transcript at `/keywords`
7. **Revision** — Generate flashcards or MCQ quizzes at `/revision`; track accuracy and streaks
8. **Ask Kiki** — Click the 🐒 FAB on any page to open an AI chat. On the Transcripts page, Kiki loads your lecture content as context

---

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── controllers/   # Business logic (content, transcribe, user, chat)
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # Express routers
│   │   ├── middleware/    # JWT auth
│   │   ├── services/      # summaryService (GPT)
│   │   └── server.js      # Entry point + /api/analyze proxy
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/         # Transcribe, Transcripts, Keywords, Revision, Home, Profile
    │   ├── components/    # Sidebar, MonkeyChat, Mascot, UI primitives
    │   ├── context/       # AuthContext, LanguageContext
    │   ├── api/           # Typed API client
    │   └── i18n/          # en.js, vi.js locale files
    └── .env
```

---

## API Reference (key endpoints)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/signin` | Login → JWT |
| GET | `/api/users/me` | Current user |
| PUT | `/api/users/me` | Update display name / date of birth |
| PUT | `/api/users/me/password` | Change password |
| POST | `/api/content/transcripts` | Save transcript (triggers summary + keywords async) |
| GET | `/api/content/transcripts` | List transcripts |
| POST | `/api/transcribe/upload` | Whisper file transcription |
| POST | `/api/transcribe/correct` | GPT text correction |
| POST | `/api/chat/stream` | Kiki SSE chat stream |
| POST | `/api/analyze` | Proxy to keyword analysis service |

---

## Troubleshooting

- **Microphone not working** — Ensure Chrome or Edge has microphone permission; Firefox does not support the Web Speech API
- **Keywords not appearing** — Check that `OPENAI_API_KEY` is set correctly in backend `.env`
- **Summary shows "Generating…"** — Summary is generated asynchronously after save; refresh the Transcripts page after a few seconds

---

## License

Released under the MIT license.
