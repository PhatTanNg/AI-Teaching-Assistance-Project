import crypto from 'crypto';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_TOKENS_PER_CHUNK = 3000; // ~3000 tokens ≈ ~12000 chars

// Rough token estimate (1 token ≈ 4 chars for English/Vietnamese)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Split a long text into chunks of at most MAX_TOKENS_PER_CHUNK tokens
function chunkText(text) {
  const maxChars = MAX_TOKENS_PER_CHUNK * 4;
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      if (lastPeriod > start + maxChars * 0.5) end = lastPeriod + 1;
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

async function callOpenAI(messages, retryOnce = true) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI response');

  try {
    return JSON.parse(content);
  } catch {
    if (retryOnce) {
      console.warn('[MindMap] JSON parse failed, retrying once...');
      return callOpenAI(messages, false);
    }
    throw new Error('Failed to parse mind map JSON from OpenAI');
  }
}

const SYSTEM_PROMPT = `You are analyzing lecture transcript(s) to create a structured mind map.

Rules:
- Return ONLY valid JSON, no markdown fences, no explanation
- Structure: { "title": "string", "children": [{ "label": "string", "sourceText": "optional excerpt", "children": [...] }] }
- Root = main topic of the lecture(s)
- Level 2 = major themes (maximum 6 nodes)
- Level 3 = key concepts per theme (maximum 4 per parent)
- Level 4 = definitions or examples (optional, maximum 2 per parent)
- Node labels: 2–5 words, concise and clear
- sourceText: include ONLY for level 3+ nodes — 1–2 sentence excerpt directly from the transcript
- Multiple transcripts: merge overlapping concepts, group related ideas across sessions`;

// Extract topics from a single chunk (used for long transcripts)
async function extractTopicsFromChunk(chunk, index) {
  const result = await callOpenAI([
    { role: 'system', content: `${SYSTEM_PROMPT}\n\nFor this chunk, extract key topics as a JSON tree. This will be merged with other chunks later.` },
    { role: 'user', content: `Transcript chunk ${index + 1}:\n\n${chunk}` },
  ]);
  return result;
}

// Merge multiple topic trees into one cohesive mind map
async function mergeTopics(topicTrees, allTranscriptsText) {
  const treesJson = JSON.stringify(topicTrees, null, 2);
  const result = await callOpenAI([
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Merge these topic trees extracted from different parts of the lecture into one cohesive mind map. Remove duplicates, group related concepts, and ensure the final structure follows all rules.\n\nTopic trees to merge:\n${treesJson}`,
    },
  ]);
  return result;
}

/**
 * Generate a mind map from one or more transcript texts.
 * @param {string[]} transcriptTexts - Array of raw transcript strings
 * @returns {{ title: string, children: object[] }}
 */
export async function generateMindMap(transcriptTexts) {
  // Validate minimum length
  const wordCounts = transcriptTexts.map((t) => t.trim().split(/\s+/).length);
  const shortTranscripts = wordCounts.filter((c) => c < 100);
  if (shortTranscripts.length > 0) {
    throw new Error(
      `One or more transcripts are too short (minimum 100 words). Please add more content.`
    );
  }

  // Combine all transcripts with section labels
  const combinedText = transcriptTexts
    .map((text, i) => (transcriptTexts.length > 1 ? `=== Transcript ${i + 1} ===\n${text}` : text))
    .join('\n\n');

  const totalTokens = estimateTokens(combinedText);

  if (totalTokens <= MAX_TOKENS_PER_CHUNK) {
    // Short enough: single call
    const result = await callOpenAI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Input transcripts:\n\n${combinedText}` },
    ]);
    return result;
  }

  // Long content: chunk each transcript, extract topics in parallel, then merge
  const allChunks = [];
  for (let i = 0; i < transcriptTexts.length; i++) {
    const chunks = chunkText(transcriptTexts[i]);
    for (const chunk of chunks) {
      allChunks.push({ chunk, transcriptIndex: i });
    }
  }

  console.log(`[MindMap] Processing ${allChunks.length} chunks in parallel...`);
  const topicTrees = await Promise.all(
    allChunks.map(({ chunk }, idx) => extractTopicsFromChunk(chunk, idx))
  );

  if (topicTrees.length === 1) return topicTrees[0];
  return mergeTopics(topicTrees, combinedText);
}

/**
 * Compute a stable cache hash from a sorted array of transcript IDs.
 * @param {string[]} transcriptIds
 * @returns {string} SHA-1 hex string
 */
export function computeHash(transcriptIds) {
  const sorted = [...transcriptIds].map(String).sort();
  return crypto.createHash('sha1').update(sorted.join(',')).digest('hex');
}
