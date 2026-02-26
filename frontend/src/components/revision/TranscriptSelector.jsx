import { useMemo } from 'react';

const difficultyOptions = ['easy', 'medium', 'hard'];
const countOptions = [5, 10, 20];

const formatDate = (value) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

export default function TranscriptSelector({
  transcripts,
  selectedIds,
  onToggleTranscript,
  difficulty,
  onDifficultyChange,
  count,
  onCountChange,
  onGenerateFlashcards,
  onGenerateMcqs,
  isLoading,
}) {
  const transcriptRows = useMemo(() => transcripts || [], [transcripts]);

  return (
    <section className="card" aria-label="Transcript selector">
      <h2>Select Transcripts for Revision</h2>

      <div>
        {transcriptRows.length === 0 ? (
          <p>No transcripts available.</p>
        ) : (
          transcriptRows.map((transcript, index) => (
            <label key={transcript._id || transcript.id || index} className="revision-selector__item">
              <input
                type="checkbox"
                checked={selectedIds.includes(transcript._id || transcript.id)}
                onChange={() => onToggleTranscript(transcript._id || transcript.id)}
                disabled={isLoading}
              />
              <span>
                Transcript {index + 1} — "{transcript.subject || 'Untitled'}" ({formatDate(transcript.transcribedAt)})
              </span>
            </label>
          ))
        )}
      </div>

      <div>
        <p>Difficulty:</p>
        {difficultyOptions.map((value) => (
          <button
            key={value}
            type="button"
            className={`btn ${difficulty === value ? '' : 'btn--ghost'}`}
            onClick={() => onDifficultyChange(value)}
            disabled={isLoading}
          >
            {value}
          </button>
        ))}
      </div>

      <div>
        <p>Count:</p>
        {countOptions.map((value) => (
          <button
            key={value}
            type="button"
            className={`btn ${count === value ? '' : 'btn--ghost'}`}
            onClick={() => onCountChange(value)}
            disabled={isLoading}
          >
            {value}
          </button>
        ))}
      </div>

      <div>
        <button
          type="button"
          className="btn"
          onClick={onGenerateFlashcards}
          disabled={isLoading || selectedIds.length === 0}
        >
          Generate Flashcards
        </button>
        <button
          type="button"
          className="btn"
          onClick={onGenerateMcqs}
          disabled={isLoading || selectedIds.length === 0}
        >
          Generate MCQs
        </button>
      </div>
    </section>
  );
}
