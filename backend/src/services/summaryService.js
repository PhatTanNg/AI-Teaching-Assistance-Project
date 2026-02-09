/**
 * Summary Service
 * Handles automatic summarization of transcripts using OpenAI API.
 * This service is designed to be called automatically after a transcript is saved,
 * providing seamless summarization without requiring user interaction.
 */

/**
 * Generates a summary for a transcript using OpenAI's GPT API
 * @param {string} transcript - The transcript text to summarize
 * @returns {Promise<string>} - The generated summary text
 * @throws {Error} - If summarization fails or API key is missing
 */
export const generateSummary = async (transcript) => {
  // Load API key from environment variable
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript cannot be empty');
  }

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
            content: 'You are a helpful assistant that creates concise, clear summaries of educational lecture transcripts. Provide a summary that captures the main points and key concepts.',
          },
          {
            role: 'user',
            content: `Please summarize the following lecture transcript:\n\n${transcript}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
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
