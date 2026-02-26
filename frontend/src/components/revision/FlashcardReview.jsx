import { useMemo, useState } from 'react';

const ratingButtons = [
  { label: 'Forgot', value: 1 },
  { label: 'Hard', value: 2 },
  { label: 'Good', value: 3 },
  { label: 'Easy', value: 4 },
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
    if (activeIndex < total - 1) {
      setActiveIndex((prev) => prev + 1);
    }
  };

  if (!currentCard) {
    return (
      <section className="card">
        <h2>Flashcard Review</h2>
        <p>No flashcards generated yet.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Flashcard Review</h2>
      <p>
        Card {activeIndex + 1} of {total}
      </p>
      <progress value={activeIndex + 1} max={total} />

      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => setIsFlipped((prev) => !prev)}
        disabled={isLoading}
      >
        {isFlipped ? 'Show Front' : 'Flip Card'}
      </button>

      <div className="revision-flashcard" aria-live="polite">
        <h3>{isFlipped ? currentCard.back : currentCard.front}</h3>
        <p>Source: {currentCard.source_ref || '-'}</p>
      </div>

      {isFlipped ? (
        <div>
          {ratingButtons.map((item) => (
            <button
              key={item.value}
              type="button"
              className="btn"
              onClick={() => handleRate(item.value)}
              disabled={isLoading}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {nextReviewDate ? <p>Next review: {nextReviewDate}</p> : null}
    </section>
  );
}
