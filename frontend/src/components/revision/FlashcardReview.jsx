import { useMemo, useState } from 'react';

const ratingButtons = [
  { label: '😟', sublabel: 'Forgot', value: 1 },
  { label: '😐', sublabel: 'Hard', value: 2 },
  { label: '😊', sublabel: 'Good', value: 3 },
  { label: '🤩', sublabel: 'Easy', value: 4 },
];

export default function FlashcardReview({ cards, onRate, isLoading }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [nextReviewDate, setNextReviewDate] = useState('');

  const total = cards?.length || 0;
  const currentCard = useMemo(() => (total > 0 ? cards[activeIndex] : null), [cards, activeIndex, total]);

  const handleRate = async (rating) => {
    if (!currentCard) return;
    const response = await onRate(currentCard.id, rating);
    setNextReviewDate(response?.next_review ? new Date(response.next_review).toLocaleString() : '');
    setIsFlipped(false);
    if (activeIndex < total - 1) setActiveIndex(prev => prev + 1);
  };

  if (!currentCard) {
    return (
      <section className="card revision-card">
        <h2 className="revision-card__title">Flashcard Review</h2>
        <p style={{ color: 'var(--text-muted)' }}>No flashcards generated yet. Select transcripts and click "Generate Flashcards" above.</p>
      </section>
    );
  }

  return (
    <section className="card revision-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="revision-card__title">Flashcard Review</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Card {activeIndex + 1} / {total}
        </span>
      </div>

      <div className="flashcard-progress">
        <div className="flashcard-progress__fill" style={{ width: `${((activeIndex + 1) / total) * 100}%` }} />
      </div>

      {/* 3D Flip Card */}
      <div className="flashcard-container" onClick={() => { if (!isLoading) setIsFlipped(prev => !prev); }}>
        <div className={`flashcard-inner ${isFlipped ? 'flashcard-inner--flipped' : ''}`}>
          <div className="flashcard-face flashcard-front">
            <span className="flashcard-label">QUESTION</span>
            <p className="flashcard-text">{currentCard.front}</p>
            <span className="flashcard-hint">Click to flip</span>
          </div>
          <div className="flashcard-face flashcard-back">
            <span className="flashcard-label">ANSWER</span>
            <p className="flashcard-text">{currentCard.back}</p>
            {currentCard.source_ref && (
              <span className="flashcard-source">Source: {currentCard.source_ref}</span>
            )}
          </div>
        </div>
      </div>

      {/* SRS Rating */}
      {isFlipped && (
        <div className="flashcard-ratings">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            How well did you know this?
          </p>
          <div className="flashcard-ratings__buttons">
            {ratingButtons.map(item => (
              <button key={item.value} type="button" className="flashcard-rate-btn"
                onClick={() => handleRate(item.value)} disabled={isLoading}>
                <span className="flashcard-rate-btn__emoji">{item.label}</span>
                <span className="flashcard-rate-btn__text">{item.sublabel}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {nextReviewDate && (
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          Next review: {nextReviewDate}
        </p>
      )}
    </section>
  );
}
