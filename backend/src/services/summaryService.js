/**
 * Summary Service
 * Handles automatic summarization of transcripts using OpenAI API.
 * This service is designed to be called automatically after a transcript is saved,
 * providing seamless summarization without requiring user interaction.
 */

/**
 * Generates structured study notes for a transcript using OpenAI's GPT API.
 * Output is Markdown with LaTeX math notation where applicable.
 * @param {string} transcript - The transcript text
 * @param {{ subject?: string, date?: string }} options - Optional subject and date
 * @returns {Promise<string>} - The generated notes in Markdown
 * @throws {Error} - If generation fails or API key is missing
 */
export const generateSummary = async (transcript, { subject = '', date = '', targetLanguage = '' } = {}) => {
  // Load API key from environment variable
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript cannot be empty');
  }

  const today = date || new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const subjectHint = subject ? `The lecture subject is: "${subject}".` : '';
  const langMap = { vi: 'Vietnamese', en: 'English', ga: 'Irish (Gaeilge)' };
  const outputLang = langMap[targetLanguage] || null;
  const langInstruction = outputLang
    ? `Write ALL notes in ${outputLang}. All section headings must be in ${outputLang}.`
    : 'Detect the language of the transcript and write ALL notes in that language (Vietnamese or English). Section headings must also be in the detected language.';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert academic note-taking assistant for university students. Generate structured study notes from lecture transcripts in Markdown format.

${langInstruction}

Output structure:
# [Topic title inferred from transcript]
**Ngày / Date:** ${today}${subject ? `\n**Môn học / Subject:** ${subject}` : ''}

## [Giới thiệu / Introduction]
[1–2 sentences]

## [Khái niệm chính / Key Concepts]
- **[term]**: [definition]
(3–8 items)

## [Công thức / Formulas] ← INCLUDE ONLY if math/formulas are present
$$[LaTeX]$$
*[Explanation]*

## [Tóm tắt / Summary]
- [bullet takeaway]
(3–5 items)

## [Câu hỏi ôn tập / Review Questions]
1. [question to test understanding]
(3–5 numbered questions, no answers)

RULES:
- ${langInstruction}
- Use LaTeX notation for math: $inline$ or $$block$$
- Omit the Formulas section if there is no mathematical content
- Always include the Review Questions section
- Do NOT include any text outside the markdown notes`,
          },
          {
            role: 'user',
            content: `${subjectHint}\n\nTranscript:\n\n${transcript}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `OpenAI API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No summary generated from OpenAI API');
    }

    const summary = data.choices[0].message?.content?.trim();
    
    if (!summary) {
      throw new Error('Empty summary received from OpenAI API');
    }

    return summary;
  } catch (error) {
    console.error('Error generating summary:', error.message);
    throw error;
  }
};
