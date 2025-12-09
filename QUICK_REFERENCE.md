# Quick Reference Guide

## 🚀 Starting the System

### Start All Services (PowerShell)
```powershell
.\start-all.ps1
```

### Start Individual Services
```bash
# Terminal 1 - Node Backend (Port 5001)
cd backend
npm run dev

# Terminal 2 - Python Backend (Port 5002)
cd python-backend
python app.py

# Terminal 3 - Frontend (Port 5173)
cd frontend
npm run dev
```

### Check Services Are Running
```bash
# Node Backend Health
curl http://localhost:5001

# Python Backend Health
curl http://localhost:5002/api/health

# Frontend
Open http://localhost:5173 in browser
```

---

## 📝 Using the Transcription Feature

### Starting a Session
1. Navigate to http://localhost:5173/transcribe
2. Enter lecture name (optional)
3. Choose mode:
   - **"Start Recording"** - Browser speech recognition
   - **"Realtime"** - WebSocket streaming
   - **"Demo"** - Pre-recorded demo
4. Allow microphone access
5. Start speaking

### Keywords
- **Automatic**: Wait 2 seconds after speaking (AI analyzes)
- **Manual**: Click "Analyze" button
- **Custom**: Select text → "Add Keyword"

### Viewing Definitions
- **Hover** over any highlighted keyword
- **Sidebar** shows all keywords with definitions
- **Color codes**:
  - Blue = AI-detected
  - Yellow = Manually added

---

## 🔧 Configuration Quick Tweaks

### Adjust Analysis Speed (Frontend)
File: `frontend/src/pages/Transcribe.jsx`

```javascript
// Change debounce time (default: 2000ms)
setTimeout(() => analyzeTranscript(transcript), 2000);

// Change minimum transcript length (default: 50)
if (transcript.length < 50) return;

// Change analysis frequency (default: 100 chars)
if (transcript.length - lastAnalyzedLength < 100) return;
```

### Change Number of Keywords (Backend)
File: `python-backend/app.py`

```python
# Change max keywords returned
def extract_keywords_spacy(text: str, max_keywords: int = 10):  # Change 10
def extract_keywords_keybert(text: str, max_keywords: int = 10):  # Change 10
merged_keywords = merge_keywords(spacy_kw, keybert_kw)[:15]  # Change 15
```

### Change Definition Length (Backend)
File: `python-backend/app.py`

```python
# Change number of sentences (default: 2)
summary = wikipedia.summary(keyword, sentences=2, auto_suggest=True)

# Change max length (default: 200 chars)
if len(first_sentence) > 200:
    first_sentence = first_sentence[:197] + '...'
```

---

## 🧪 Testing Commands

### Test Python Backend
```bash
cd python-backend
python test_backend.py
```

### Manual API Test
```bash
curl -X POST http://localhost:5002/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"transcript\": \"Machine learning is a type of artificial intelligence.\"}"
```

### Test Node Backend WebSocket
```bash
# Check WebSocket endpoint
curl http://localhost:5001/ws/realtime-proxy
# Should return: "websocket proxy endpoint"
```

---

## 🐛 Common Issues & Fixes

### "spaCy model not found"
```bash
python -m spacy download en_core_web_sm
```

### "Port already in use"
```bash
# Windows - Find and kill process
netstat -ano | findstr :5002
taskkill /PID <PID> /F

# Or change port in app.py:
app.run(host='0.0.0.0', port=5003, debug=True)
```

### "Speech recognition not working"
- ✅ Use Chrome, Edge, or Safari
- ✅ Allow microphone permissions
- ✅ Check microphone is selected correctly
- ✅ Try "Realtime" mode instead

### "Keywords not appearing"
```bash
# 1. Check Python backend is running
curl http://localhost:5002/api/health

# 2. Check browser console for errors
Open DevTools → Console tab

# 3. Verify transcript length
Must have at least 50 characters

# 4. Try manual analysis
Click "Analyze" button
```

### "CORS error"
Check Python backend has CORS enabled:
```python
# In app.py
from flask_cors import CORS
CORS(app)  # Should be present
```

---

## 📊 API Endpoints Reference

### Python Backend (Port 5002)

#### POST /api/analyze
Extract keywords from transcript

**Request:**
```json
{
  "transcript": "Your lecture text..."
}
```

**Response:**
```json
{
  "transcript": "Your lecture text...",
  "keywords": [
    {"word": "keyword1", "definition": "Definition 1..."},
    {"word": "keyword2", "definition": "Definition 2..."}
  ]
}
```

#### GET /api/health
Check backend status

**Response:**
```json
{
  "status": "healthy",
  "spacy_loaded": true,
  "keybert_loaded": true
}
```

### Node Backend (Port 5001)

#### WebSocket /ws/realtime-proxy
Stream audio for transcription

**Protocol:** Binary PCM audio (16kHz, 16-bit)

---

## 📁 File Locations

### Configuration Files
```
backend/.env              - Node backend config
frontend/.env             - Frontend config
python-backend/app.py     - Python backend settings
```

### Main Components
```
frontend/src/pages/Transcribe.jsx          - Enhanced transcription UI
python-backend/app.py                      - Keyword analysis API
backend/src/server.js                      - Node backend + WebSocket
```

### Documentation
```
README.md                  - Main readme
COMPLETE_SETUP_GUIDE.md    - Full documentation
DATA_FLOW_EXAMPLE.md       - Data flow explanation
python-backend/README.md   - Python backend docs
INTEGRATION_GUIDE.jsx      - Integration examples
```

---

## 💡 Pro Tips

### Optimize for Speed
1. Reduce debounce time to 1000ms for faster analysis
2. Increase analysis threshold to 200 chars for less frequent calls
3. Cache Wikipedia definitions in database

### Improve Accuracy
1. Use subject-specific spaCy models (e.g., `en_core_sci_sm` for science)
2. Customize keyword extraction in `app.py`
3. Add custom stopwords for your domain

### Better Definitions
1. Use OpenAI API instead of Wikipedia for more context
2. Create custom definition database for your course
3. Add translation for non-English terms

### Save Resources
1. Only run Python backend when needed
2. Use local dictionary instead of Wikipedia API
3. Implement definition caching

---

## 🔄 Update Workflow

### Update Dependencies
```bash
# Node packages
cd backend && npm update
cd frontend && npm update

# Python packages
cd python-backend && pip install -r requirements.txt --upgrade
```

### Pull Latest Changes
```bash
git pull
npm install  # Update node packages
pip install -r python-backend/requirements.txt  # Update Python packages
```

---

## 🎯 Keyboard Shortcuts

While transcribing:
- **Select text** → Click "Add Keyword" or press Enter
- **Ctrl+S** → Save transcript (if implemented)
- **Esc** → Clear selection

---

## 📞 Support

**Check logs:**
- Browser: F12 → Console tab
- Node Backend: Terminal output
- Python Backend: Terminal output

**Debug mode:**
```python
# Python backend (app.py)
app.run(host='0.0.0.0', port=5002, debug=True)  # debug=True shows errors
```

**Verbose logging:**
```javascript
// Frontend (Transcribe.jsx)
console.log('Analyzing transcript:', transcript);
console.log('Keywords received:', data.keywords);
```

---

**Last Updated:** December 2025  
**Version:** 1.0.0
