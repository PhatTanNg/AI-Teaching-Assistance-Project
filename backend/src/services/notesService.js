/**
 * Notes Service
 * Generates detailed Cornell-style study notes from lecture transcripts
 * using OpenAI Responses API with web_search_preview for external research.
 */

export const generateNotes = async (transcript, { subject = '', date = '', targetLanguage = '' } = {}) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not set');
  if (!transcript || transcript.trim().length === 0) throw new Error('Transcript cannot be empty');

  const today = date || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const subjectHint = subject ? `The lecture subject is: "${subject}".` : '';
  const langMap = { vi: 'Vietnamese', en: 'English', ga: 'Irish (Gaeilge)' };
  const outputLang = langMap[targetLanguage] || null;
  const langInstruction = outputLang
    ? `Write ALL notes in ${outputLang}. All section headings must be in ${outputLang}.`
    : 'Detect the language of the transcript and write ALL notes in that language. All headings must also be in the detected language.';

  const systemPrompt = `You are an expert academic note-taking assistant for university students. Generate comprehensive Cornell Notes from the lecture transcript below.

${langInstruction}

${subjectHint}

Use web search to look up and verify technical concepts, definitions, and related resources mentioned in the transcript. Include relevant URLs as references.

Output the notes in Markdown with this Cornell Notes structure:

# [Topic title inferred from transcript]
**Ngày / Date:** ${today}${subject ? `\n**Môn học / Subject:** ${subject}` : ''}

---

## 📝 Main Notes
[Detailed explanations of each concept covered in the lecture. Use sub-headings (###) for each topic. Include examples, diagrams in ASCII if helpful, and step-by-step breakdowns. Use LaTeX for math: $inline$ or $$block$$. This section should be thorough — 400–800 words.]

---

## 🔑 Key Terms & Definitions
| Term | Definition |
|------|-----------|
| **[term]** | [precise definition, verified with web search] |
(Include 5–10 terms)

---

## 🔗 Connections & Context
[How these concepts relate to broader topics, prerequisites, or real-world applications. 3–5 bullet points based on web research.]

---

## 📐 Formulas & Equations
[INCLUDE ONLY if mathematical content is present. Use LaTeX notation.]
$$[formula]$$
*[Explanation of variables and when to use it]*

---

## 💡 Summary
[3–5 concise bullet points capturing the essential takeaways]

---

## ❓ Review Questions
1. [Question testing deep understanding]
(5–7 numbered questions with no answers)

---

## 🌐 References
- [Title](URL) — [one-line description]
(Include 3–5 web references found during research)

RULES:
- ${langInstruction}
- Use LaTeX for all math
- Always include the References section with real URLs from web search
- The Main Notes section must be detailed and comprehensive, not a summary
- Do NOT include any text outside the markdown notes`;

  // Use OpenAI Responses API with web_search_preview tool
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${subjectHint}\n\nTranscript:\n\n${transcript}` },
      ],
      max_output_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract text from Responses API output array
  const messageOutput = data.output?.find(o => o.type === 'message');
  const textContent = messageOutput?.content?.find(c => c.type === 'output_text');
  const notes = textContent?.text?.trim();

  if (!notes) throw new Error('No notes generated from OpenAI API');
  return notes;
};
