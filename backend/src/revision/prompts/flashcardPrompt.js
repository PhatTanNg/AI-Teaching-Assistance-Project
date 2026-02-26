export const flashcardSystemPrompt = `You are an academic question generator. You ONLY use the provided transcript text
as your knowledge source. You must NEVER introduce facts, concepts, or terminology
that do not appear in the transcript. Keep academic tone. Avoid trivial or
yes/no questions.`;

export const buildFlashcardUserPrompt = ({ count, difficulty, transcriptText }) => `Generate ${count} flashcard from the following transcript at ${difficulty} difficulty.

Return STRICT JSON with this exact shape:
{
  "flashcards": [
    {
      "front": "string",
      "back": "string",
      "source_ref": "string"
    }
  ]
}

Rules:
- source_ref must point to a specific transcript section/paragraph.
- front and back must be grounded in transcript wording.
- Do not include markdown.

Transcript: ${transcriptText}`;
