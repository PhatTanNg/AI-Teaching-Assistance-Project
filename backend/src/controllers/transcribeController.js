


import { SpeechClient } from '@google-cloud/speech';

// Supported file types for Google: wav, flac, mp3, mp4, m4a, amr, ogg, webm
export const transcribe = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Validate file type
    const allowedTypes = [
      'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/amr', 'audio/ogg', 'audio/webm'
    ];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported audio format. Please upload wav, flac, mp3, mp4, m4a, amr, ogg, or webm.' });
    }

    // Google authentication: uses GOOGLE_APPLICATION_CREDENTIALS env var for service account JSON
    const client = new SpeechClient();

    // Convert buffer to base64 string for Google API
    const audioBytes = req.file.buffer.toString('base64');

    const audio = {
      content: audioBytes,
    };
    const config = {
      encoding: 'LINEAR16', // or 'MP3', 'FLAC', etc. based on file type
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    };

    const request = {
      audio,
      config,
    };

    // Send request to Google Speech-to-Text
    const [response] = await client.recognize(request);
    const transcript = response.results
      ? response.results.map(r => r.alternatives[0].transcript).join(' ')
      : '';
    return res.json({ transcript });
  } catch (err) {
    console.error('Google Speech-to-Text error:', err.message);
    return res.status(500).json({ error: 'Transcription failed', details: err.message });
  }
};
