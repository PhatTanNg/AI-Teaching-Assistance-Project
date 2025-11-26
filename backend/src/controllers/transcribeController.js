import axios from 'axios';

export const transcribe = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Deepgram API key not configured' });

    const url = 'https://api.deepgram.com/v1/listen?model=general&language=en-US';

    const headers = {
      Authorization: `Token ${apiKey}`,
      'Content-Type': req.file.mimetype || 'application/octet-stream'
    };

    const response = await axios.post(url, req.file.buffer, {
      headers,
      responseType: 'json'
    });

    const transcript = response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript
      || response.data?.channels?.[0]?.alternatives?.[0]?.transcript
      || response.data?.results?.[0]?.alternatives?.[0]?.transcript
      || '';

    return res.json({ transcript });
  } catch (err) {
    console.error('Deepgram transcription error:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Transcription failed', details: err?.response?.data || err.message });
  }
};
