import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function FlashcardReview({ cards, onRate, isLoading }) {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [nextReviewDate, setNextReviewDate] = useState('');

  const ratingButtons = [
    { label: '😟', sublabel: t('revision.ratingForgot'), value: 1 },
    { label: '😐', sublabel: t('revision.ratingHard'), value: 2 },
    { label: '😊', sublabel: t('revision.ratingGood'), value: 3 },
    { label: '🤩', sublabel: t('revision.ratingEasy'), value: 4 },
  ];

  const total = cards?.length || 0;
  const currentCard = useMemo(() => (total > 0 ? cards[activeIndex] : null), [cards, activeIndex, total]);

  const handleRate = async (rating) => {
    if (!currentCard) return;
    const response = await onRate(currentCard.id, rating);
    setNextReviewDate(response?.next_review ? new Date(response.next_review).toLocaleString() : '');
    setIsFlipped(false);
    if (activeIndex < total - 1) setActiveIndex(prev => prev + 1);
  };

  const goTo = (idx) => {
    setActiveIndex(idx);
    setIsFlipped(false);
    setNextReviewDate('');
  };

  if (!currentCard) {
    return (
      <section className="card revision-card">
        <h2 className="revision-card__title">{t('revision.flashcardTitle')}</h2>
        <p style={{ color: 'var(--text-muted)' }}>{t('revision.noFlashcards')}</p>
      </section>
    );
  }

  return (
    <section className="card revision-card">
      <div style={{ marginBottom: '1rem' }}>
        <h2 className="revision-card__title">{t('revision.flashcardTitle')}</h2>
      </div>

      <div className="flashcard-progress">
        <div className="flashcard-progress__fill" style={{ width: `${((activeIndex + 1) / total) * 100}%` }} />
      </div>

      {/* Prev / Next navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <button type="button" onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0}
          className="btn btn--ghost btn--sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ChevronLeft size={16} /> Prev
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {t('revision.cardLabel')} {activeIndex + 1} / {total}
        </span>
        <button type="button" onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === total - 1}
          className="btn btn--ghost btn--sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* 3D Flip Card */}
      <div className="flashcard-container" onClick={() => { if (!isLoading) setIsFlipped(prev => !prev); }}>
        <div className={`flashcard-inner ${isFlipped ? 'flashcard-inner--flipped' : ''}`}>
          <div className="flashcard-face flashcard-front">
            <span className="flashcard-label">{t('revision.questionLabel')}</span>
            <p className="flashcard-text">{currentCard.front}</p>
            <span className="flashcard-hint">{t('revision.clickToFlip')}</span>
          </div>
          <div className="flashcard-face flashcard-back">
            <span className="flashcard-label">{t('revision.answerLabel')}</span>
            <p className="flashcard-text">{currentCard.back}</p>
            {currentCard.source_ref && (
              <span className="flashcard-source">{t('revision.sourcePrefix')}: {currentCard.source_ref}</span>
            )}
          </div>
        </div>
      </div>

      {/* SRS Rating */}
      {isFlipped && (
        <div className="flashcard-ratings">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            {t('revision.ratingPrompt')}
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
          {t('revision.nextReviewPrefix')}: {nextReviewDate}
        </p>
      )}
    </section>
  );
}
