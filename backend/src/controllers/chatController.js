const SYSTEM_PROMPT = `You are Kiki 🐒, a helpful study monkey and AI tutor for university students. Your personality:
- Friendly, encouraging, and occasionally playful (use 🐒 or 🍌 sparingly)
- Academic and precise — you help students understand lecture content deeply
- Concise: keep answers focused, use bullet points or short paragraphs
- When given lecture context, prioritise it in your answers
- Language: respond in the same language the student uses (Vietnamese or English)

If lecture content is provided, use it to give specific, grounded answers rather than generic ones.`;

const buildMessages = ({ messages, context }) => {
  let contextBlock = '';

  if (context?.transcript || context?.summary) {
    // Single-lecture mode — full transcript/summary for the open lecture
    contextBlock = `\n\n--- LECTURE CONTEXT ---\n${
      context.transcript ? `Transcript:\n${context.transcript.slice(0, 3000)}\n` : ''
    }${context.summary ? `Summary:\n${context.summary.slice(0, 1000)}\n` : ''
    }${context.topic ? `Topic: ${context.topic}\n` : ''
    }--- END CONTEXT ---`;
  } else if (context?.allLectures) {
    // Library mode — compact index of all saved lectures (subject + date + summary)
    contextBlock = `\n\n--- LECTURE LIBRARY ---\n${context.allLectures}\n--- END LIBRARY ---\nSử dụng thư viện trên để trả lời câu hỏi về bất kỳ bài giảng nào. Bài [1] là bài gần nhất.`;
  }

  return [{ role: 'system', content: SYSTEM_PROMPT + contextBlock }, ...messages];
};

export const chatStreamHandler = async (req, res) => {
  const { messages, context } = req.body;

  if (!messages?.length) {
    return res.status(400).json({ error: 'messages is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        stream: true,
        temperature: 0.7,
        max_tokens: 800,
        messages: buildMessages({ messages, context }),
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      res.write(`data: [ERROR] ${errText}\n\n`);
      return res.end();
    }

    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch {
          // ignore parse errors for malformed chunks
        }
      }
    }

    res.end();
  } catch (err) {
    console.error('[CHAT] Stream error:', err.message);
    try {
      res.write(`data: [ERROR] ${err.message}\n\n`);
      res.end();
    } catch { /* response already ended */ }
  }
};
