# AI Teaching Assistant

Nền tảng hỗ trợ dạy học AI: chuyển giọng nói thành văn bản, tự động trích xuất từ khóa, giải thích khái niệm cho học sinh.

## Cài đặt nhanh

### Backend Node.js
```bash
cd backend
npm install
# Thêm file .env (xem ví dụ trong repo)
npm run dev
```

### Backend Python (AI Keyword)
```bash
cd python-backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python app.py
```

### Frontend React
```bash
cd frontend
npm install
# Thêm file .env nếu cần sửa API URL
npm run dev
```

## Chạy tất cả cùng lúc (Windows)
```powershell
./start-all.ps1
```

## Link deploy (nếu có)
- Backend: [link Render/Heroku bạn đã cấu hình]
- Frontend: [link Vercel/Netlify bạn đã deploy]

## Sử dụng
1. Truy cập trang `/transcribe` để trải nghiệm AI tự động trích xuất từ khóa và giải thích.
2. Có thể chọn từ khóa thủ công hoặc dùng AI, cả hai đều lưu ở sidebar.
3. Hover vào từ khóa để xem giải thích.

## Ghi chú
- Nếu gặp lỗi speech recognition: dùng Chrome/Edge/Safari, kiểm tra quyền micro.
- Nếu không thấy từ khóa: kiểm tra backend Python đã chạy, transcript đủ dài (>50 ký tự).
- Đã tối giản tài liệu, chi tiết về công nghệ và các công cụ xem trực tiếp trong code hoặc hỏi AI.
   ```
   The Python backend runs on port 5002.

3. Test the backend:
   ```bash
   python test_backend.py
   ```

## 🚀 Quick Start - Run All Services

**Windows PowerShell:**
```powershell
.\start-all.ps1
```

**Manual (3 terminals):**
```bash
# Terminal 1 - Node Backend
cd backend && npm run dev

# Terminal 2 - Python Backend  
cd python-backend && python app.py

# Terminal 3 - Frontend
cd frontend && npm run dev
```

**Access:** http://localhost:5173

## 📖 Using the AI Features

1. Navigate to the Transcription page
2. Click "Start Recording" or "Realtime" to begin
3. Speak naturally - AI automatically extracts keywords
4. Hover over highlighted keywords for definitions
5. Click "Analyze" to manually trigger keyword extraction
6. Save transcripts with keywords for later review

## 🧪 Testing Keyword Analysis

Test the Python backend directly:
```bash
curl -X POST http://localhost:5002/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Machine learning is a branch of artificial intelligence that focuses on building systems that learn from data."}'
```

## 📚 Complete Documentation

For detailed setup, architecture, and troubleshooting:
- **[COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md)** - Full documentation
- **[python-backend/README.md](./python-backend/README.md)** - Python backend details

## 🛠️ Technology Stack

**Frontend:** React, Vite, Tailwind CSS, Web Speech API, WebSocket  
**Node Backend:** Express, MongoDB, JWT, Google Speech-to-Text  
**Python Backend:** Flask, spaCy, KeyBERT, Wikipedia API  

## 🔧 Configuration

**Analysis Settings** (frontend/src/pages/Transcribe.jsx):
- Debounce time: 2 seconds
- Min transcript length: 50 characters
- Analysis trigger: Every 100 new characters

**Backend Settings** (python-backend/app.py):
- Max keywords: 10-15 per analysis
- Definition length: 1-2 sentences
- Port: 5002

## 🐛 Troubleshooting

**Python backend issues:**
```bash
# spaCy model missing
python -m spacy download en_core_web_sm

# Test backend health
curl http://localhost:5002/api/health
```

**Speech recognition not working:**
- Use Chrome, Edge, or Safari
- Allow microphone permissions
- Try "Realtime" mode for WebSocket streaming

**Keywords not appearing:**
- Ensure Python backend is running on port 5002
- Check transcript has 50+ characters
- Click "Analyze" manually
- Check browser console for errors

## 📝 License

Open source - uses MIT licensed components (spaCy, KeyBERT, React, Flask)

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open the app at the URL shown in the terminal (typically `http://localhost:5173`).


