import { useMemo } from 'react';

const difficultyOptions = ['easy', 'medium', 'hard'];
const countOptions = [5, 10, 20];

const formatDate = (value) => {
  if (!value) return 'Unknown date';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString();
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
  const rows = useMemo(() => transcripts || [], [transcripts]);

  return (
    <section className="card revision-selector" aria-label="Transcript selector">
      <h2 className="revision-card__title">Select Transcripts for Revision</h2>

      <div className="revision-selector__list">
        {rows.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No transcripts available.</p>
        ) : (
          rows.map((t, i) => {
            const id = t._id || t.id;
            const isChecked = selectedIds.includes(id);
            return (
              <label key={id || i} className={`revision-selector__item ${isChecked ? 'revision-selector__item--active' : ''}`}>
                <input type="checkbox" checked={isChecked}
                  onChange={() => onToggleTranscript(id)} disabled={isLoading} />
                <span>
                  <strong>{t.subject || 'Untitled'}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                    {formatDate(t.transcribedAt)}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>

      {/* Config strip */}
      <div className="revision-selector__config">
        <div className="revision-selector__group">
          <span className="revision-selector__label">Difficulty</span>
          <div className="revision-selector__pills">
            {difficultyOptions.map(v => (
              <button key={v} type="button"
                className={`pill ${difficulty === v ? 'pill--active' : ''}`}
                onClick={() => onDifficultyChange(v)} disabled={isLoading}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="revision-selector__group">
          <span className="revision-selector__label">Count</span>
          <div className="revision-selector__pills">
            {countOptions.map(v => (
              <button key={v} type="button"
                className={`pill ${count === v ? 'pill--active' : ''}`}
                onClick={() => onCountChange(v)} disabled={isLoading}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={onGenerateFlashcards}
          disabled={isLoading || selectedIds.length === 0}>
          {isLoading ? 'Generating…' : '🃏 Generate Flashcards'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onGenerateMcqs}
          disabled={isLoading || selectedIds.length === 0}>
          {isLoading ? 'Generating…' : '📝 Generate MCQs'}
        </button>
      </div>
    </section>
  );
}
