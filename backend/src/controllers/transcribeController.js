import { SpeechClient } from '@google-cloud/speech';
import FormData from 'form-data';
import axios from 'axios';

// ── Real-time keyword extraction ──────────────────────────────────────────────
const KEYWORD_PROMPTS = {
  vi: 'Bạn là trợ lý học tập. Từ đoạn ghi âm bài giảng, hãy trích xuất 3–8 thuật ngữ kỹ thuật hoặc học thuật quan trọng mà sinh viên cần nắm. Bỏ qua các từ thông thường, tên người, lời chào hỏi. Trả về ĐÚNG JSON: [{"word":"...","definition":"..."}]. Định nghĩa bằng tiếng Việt, ngắn gọn 1–2 câu.',
  en: 'You are a study assistant. Extract 3–8 technical or academic keywords from this lecture transcript that a student should know. Ignore common words, names, and greetings. Return ONLY valid JSON: [{"word":"...","definition":"..."}]. Definitions in English, concise 1–2 sentences.',
};

export const analyzeKeywordsHandler = async (req, res) => {
  try {
    const { transcript, language = 'vi' } = req.body;
    if (!transcript?.trim()) return res.status(400).json({ error: 'No transcript provided' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

    const systemPrompt = KEYWORD_PROMPTS[language] || KEYWORD_PROMPTS.en;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Transcript:\n${transcript.substring(0, 3000)}` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: 'Keyword analysis failed', details: errText });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';
    const first = raw.indexOf('['), last = raw.lastIndexOf(']');
    let keywords = [];
    if (first !== -1 && last !== -1) {
      try {
        const parsed = JSON.parse(raw.slice(first, last + 1));
        if (Array.isArray(parsed)) {
          keywords = parsed
            .filter(k => k?.word)
            .map(k => ({ word: k.word.trim(), definition: k.definition?.trim() || '' }));
        }
      } catch { /* return empty on parse error */ }
    }

    return res.json({ keywords });
  } catch (err) {
    console.error('Keyword analysis error:', err.message);
    return res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
};

const ALLOWED_TYPES = [
  'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/mp3', 'audio/mpeg',
  'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/amr', 'audio/ogg',
  'audio/webm', 'video/webm',
];

// ── Original Google STT (kept as backup) ─────────────────────────────────────
export const transcribe = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported audio format.' });
    }

    const client = new SpeechClient();
    const audioBytes = req.file.buffer.toString('base64');
    const [response] = await client.recognize({
      audio: { content: audioBytes },
      config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US' },
    });
    const transcript = response.results
      ? response.results.map(r => r.alternatives[0].transcript).join(' ')
      : '';
    return res.json({ transcript });
  } catch (err) {
    console.error('Google STT error:', err.message);
    return res.status(500).json({ error: 'Transcription failed', details: err.message });
  }
};

// ── Whisper API (file upload, multi-language) ─────────────────────────────────
export const transcribeWithWhisper = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported audio format.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

    const language = req.body?.language || 'vi'; // vi | en | ga
    // Determine extension from mimetype
    const extMap = {
      'audio/mp3': 'mp3', 'audio/mpeg': 'mp3',
      'audio/mp4': 'mp4', 'audio/m4a': 'mp4', 'audio/x-m4a': 'm4a',
      'audio/wav': 'wav', 'audio/x-wav': 'wav',
      'audio/flac': 'flac',
      'audio/ogg': 'ogg',
      'audio/webm': 'webm', 'video/webm': 'webm',
      'audio/amr': 'amr',
    };
    const ext = extMap[req.file.mimetype] || 'mp3';
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: `audio.${ext}`, contentType: req.file.mimetype });
    form.append('model', 'whisper-1');
    form.append('language', language);

    const { data } = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
      headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    });

    return res.json({ transcript: data.text || '' });
  } catch (err) {
    if (err.response) {
      const details = JSON.stringify(err.response.data);
      console.error('Whisper error:', err.response.status, details);
      return res.status(502).json({ error: 'Whisper transcription failed', details });
    }
    console.error('Whisper error:', err.message);
    return res.status(500).json({ error: 'Transcription failed', details: err.message });
  }
};

// ── GPT AI Correction ─────────────────────────────────────────────────────────
const CORRECTION_PROMPTS = {
  vi: 'Bạn đang sửa bản ghi âm bài giảng tiếng Việt. Hãy sửa lỗi chính tả, thêm dấu câu đúng chỗ, sửa các thuật ngữ chuyên ngành bị nghe nhầm, và điền từ bị thiếu dựa vào ngữ cảnh. Chỉ trả về văn bản đã sửa, không giải thích.',
  en: 'You are correcting an English lecture transcript. Fix spelling errors, add proper punctuation, correct technical terms that were misheard, and fill in obviously missing words based on context. Return only the corrected text, no explanations.',
  ga: 'Tá tú ag ceartú tras-scríbhinne léachta i nGaeilge. Ceartaigh botúin litrithe, cuir poncaíocht cheart leis, ceartaigh téarmaí teicniúla a cloiseadh mícheart, agus líon focal ar iarraidh. Ná seol ach an téacs ceartaithe ar ais.',
};

export const correctTranscriptHandler = async (req, res) => {
  try {
    const { text, language = 'vi' } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

    const systemPrompt = CORRECTION_PROMPTS[language] || CORRECTION_PROMPTS.en;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: 'AI correction failed', details: errText });
    }

    const data = await response.json();
    const corrected = data.choices?.[0]?.message?.content?.trim() || text;
    return res.json({ corrected });
  } catch (err) {
    console.error('AI correction error:', err.message);
    return res.status(500).json({ error: 'Correction failed', details: err.message });
  }
};
