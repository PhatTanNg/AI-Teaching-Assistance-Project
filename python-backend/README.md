# Python Keyword Analysis Backend

This service extracts keywords from transcribed text and provides student-friendly definitions.

## Features

- **Keyword Extraction**: Uses both spaCy NLP and KeyBERT for robust keyword detection
- **Smart Definitions**: Fetches concise, educational definitions from Wikipedia
- **Real-time Processing**: Fast API responses for live transcription
- **Student-Friendly**: Definitions optimized for learning

## Setup

### 1. Install Python Dependencies

```bash
cd python-backend
pip install -r requirements.txt
```

### 2. Download spaCy Model

```bash
python -m spacy download en_core_web_sm
```

### 3. Run the Server

```bash
python app.py
```

The server will start on `http://localhost:5002`

## API Endpoints

### POST /api/analyze

Analyze transcript and extract keywords with definitions.

**Request:**
```json
{
  "transcript": "Today we'll discuss machine learning and neural networks..."
}
```

**Response:**
```json
{
  "transcript": "Today we'll discuss machine learning and neural networks...",
  "keywords": [
    {
      "word": "machine learning",
      "definition": "Machine learning is a branch of artificial intelligence focused on building applications that learn from data and improve their accuracy over time without being programmed to do so."
    },
    {
      "word": "neural networks",
      "definition": "A neural network is a series of algorithms that endeavors to recognize underlying relationships in a set of data through a process that mimics the way the human brain operates."
    }
  ]
}
```

### GET /api/health

Check if the service is running and models are loaded.

**Response:**
```json
{
  "status": "healthy",
  "spacy_loaded": true,
  "keybert_loaded": true
}
```

## How It Works

1. **Keyword Extraction**:
   - spaCy identifies named entities and important noun phrases
   - KeyBERT uses transformer models to find semantically important phrases
   - Results are merged and deduplicated

2. **Definition Fetching**:
   - Wikipedia API provides authoritative, educational content
   - Definitions are truncated to 1-2 sentences for readability
   - Fallbacks handle ambiguous or missing terms gracefully

3. **Real-time Updates**:
   - Fast processing (typically < 500ms per request)
   - Designed to handle frequent updates from live transcription

## Configuration

Edit `app.py` to customize:

- `max_keywords`: Number of keywords to extract (default: 10-15)
- Port: Change the port in the `app.run()` call (default: 5002)
- Definition length: Adjust sentence count in `get_definition()`

## Troubleshooting

**spaCy model not found:**
```bash
python -m spacy download en_core_web_sm
```

**Port already in use:**
Change the port in `app.py`:
```python
app.run(host='0.0.0.0', port=YOUR_PORT, debug=True)
```

**Wikipedia API rate limiting:**
If you make many requests, consider caching definitions or using a local dictionary.
