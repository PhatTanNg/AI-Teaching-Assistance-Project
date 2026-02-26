export const mcqSystemPrompt = `You are an academic question generator. You ONLY use the provided transcript text
as your knowledge source. You must NEVER introduce facts, concepts, or terminology
that do not appear in the transcript. Keep academic tone. Avoid trivial or
yes/no questions.`;

export const buildMcqUserPrompt = ({ count, difficulty, transcriptText }) => `Generate ${count} mcq from the following transcript at ${difficulty} difficulty.

Return STRICT JSON with this exact shape:
{
  "questions": [
    {
      "question": "string",
      "options": {
        "A": "string",
        "B": "string",
        "C": "string",
        "D": "string"
      },
      "correct": "A|B|C|D",
      "explanation": "string",
      "source_ref": "string"
    }
  ]
}

Rules:
- Exactly 4 options per question.
- One and only one correct option.
- explanation must cite transcript-grounded reasoning.
- source_ref must point to a specific transcript section/paragraph.
- Do not include markdown.

Transcript: ${transcriptText}`;
