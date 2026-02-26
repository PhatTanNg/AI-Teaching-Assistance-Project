# AI Teaching Assistant

AI-powered lecture companion that records speech, generates transcripts, extracts key vocabulary, and surfaces concise definitions for students.

## Live Demo
- [Hosted Web App](https://ai-teaching-assistance-project.vercel.app/)

## System Overview
- **Frontend (React + Vite):** Real-time transcript view, keyword sidebar, manual keyword selection, persistent storage via `localStorage`.
- **Node.js Backend (Express):** REST APIs, authentication, Google Speech-to-Text integration, and a proxy endpoint that forwards keyword analysis requests to Python.
- **Python Keyword Service (Flask + NLTK):** POS-tag-based keyword extraction and Wikipedia-powered definition lookup.

## Prerequisites
- Node.js 18+
- Python 3.8+
- npm or pnpm
- (Optional) Google Cloud project with Speech-to-Text enabled and `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service-account JSON.

## Quick Start

### Node.js Backend
```bash
cd backend
npm install
# copy .env.example to .env and configure JWT secrets, MongoDB URI, GOOGLE_APPLICATION_CREDENTIALS, etc.
npm run dev
```

### Python Keyword Service
```bash
cd python-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

### React Frontend
```bash
cd frontend
npm install
# For local development, create .env.local to override API URL safely (ignored by git)
echo VITE_API_BASE_URL=http://localhost:5001 > .env.local
npm run dev
```

### Frontend Environment Strategy
- `frontend/.env`: shared/default value (used by deploy/build pipelines)
- `frontend/.env.local`: machine-specific override for local development (git-ignored)
- Vite automatically prioritizes `.env.local` over `.env`

### One-Command Startup (Windows)
```powershell
./start-all.ps1
```

Access the UI at `http://localhost:5173`.

## Using the App
1. Open the **Transcribe** page and click **Start Recording** (or demo mode) to capture speech.
2. Watch transcripts update in real time while AI-generated keywords populate the sidebar.
3. Hover over keywords for definitions, or add/remove keywords manually from highlighted text.
4. Save transcripts for later review; saved transcripts and keywords are stored in browser `localStorage`.
5. Open **Revision Mode** (`/revision`) to generate flashcards/MCQs from saved transcripts and view progress.

## Testing
- Python keyword service smoke test: `python test_backend.py`
- Health check endpoint: `curl http://localhost:5002/api/health`

## Troubleshooting
- Ensure Chrome, Edge, or Safari has microphone permissions enabled for speech capture.
- If keywords are missing, confirm the Python service is running on port 5002 and the transcript exceeds roughly 50 characters.
- When deploying, set `PYTHON_BACKEND_URL` in the Node backend so `/api/analyze` can reach the Flask service.

## License
Released under the MIT license.
