import { useMemo, useState, useEffect } from 'react';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

/**
 * Normalize options from any format:
 *   object  → { A: "text", B: "text", ... }
 *   array   → [{ label: "A", text: "..." }, ...]  OR  ["text", "text", ...]
 * Returns a safe { A, B, C, D } object.
 */
function normalizeOptions(raw) {
  if (!raw) return {};

  // Already an object with A/B/C/D keys
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    // check if it has A/B/C/D with truthy string values
    if (raw.A || raw.B || raw.C || raw.D) return raw;
    // fallback: might have lowercase keys
    if (raw.a || raw.b || raw.c || raw.d) {
      return { A: raw.a || '', B: raw.b || '', C: raw.c || '', D: raw.d || '' };
    }
    return raw;
  }

  // Array of objects with label+text
  if (Array.isArray(raw)) {
    const result = {};
    raw.forEach((item, i) => {
      const key = OPTION_KEYS[i] || String.fromCharCode(65 + i);
      if (typeof item === 'string') {
        result[key] = item;
      } else if (item && typeof item === 'object') {
        result[item.label || key] = item.text || item.value || item.content || '';
      }
    });
    return result;
  }

  return {};
}

/**
 * Extract question text from various possible field names
 */
function getQuestionText(q) {
  if (!q) return '';
  return q.question || q.content || q.body || q.text || q.title || '';
}

export default function McqQuiz({ questions, onSubmitBatch, isLoading }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);

  const currentQuestion = useMemo(
    () => (questions?.length > 0 ? questions[index] : null),
    [questions, index],
  );

  // Debug logging — remove once confirmed
  useEffect(() => {
    if (currentQuestion) {
      console.log('[MCQ] currentQuestion:', JSON.stringify(currentQuestion, null, 2));
      console.log('[MCQ] options type:', typeof currentQuestion.options, Array.isArray(currentQuestion.options) ? 'array' : 'not-array');
      console.log('[MCQ] normalized:', normalizeOptions(currentQuestion.options));
    }
  }, [currentQuestion]);

  if (!currentQuestion) {
    return (
      <section className="card revision-card">
        <h2 className="revision-card__title">MCQ Quiz</h2>
        <p style={{ color: 'var(--text-muted)' }}>No MCQs generated yet. Select transcripts and click "Generate MCQs" above.</p>
      </section>
    );
  }

  const questionText = getQuestionText(currentQuestion);
  const options = normalizeOptions(currentQuestion.options);

  const submitAnswer = async () => {
    if (!selected) return;
    const payload = await onSubmitBatch([
      { question_id: currentQuestion.id || currentQuestion._id, selected, time_taken_ms: 0 },
    ]);
    const result = payload?.submitted?.[0];
    setFeedback(result || null);
    if (result?.is_correct) setCorrectCount(prev => prev + 1);
  };

  const nextQuestion = () => {
    setSelected('');
    setFeedback(null);
    if (index < questions.length - 1) setIndex(prev => prev + 1);
  };

  return (
    <section className="card revision-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="revision-card__title">MCQ Quiz</h2>
        <span className="mcq-score">
          {correctCount}/{index + (feedback ? 1 : 0)} correct
        </span>
      </div>

      <div className="mcq-progress-bar">
        <div className="mcq-progress-bar__fill" style={{ width: `${((index + (feedback ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>

      <p className="mcq-question">
        {questionText || <span style={{ color: 'var(--accent-rose)', fontStyle: 'italic' }}>[Question text missing]</span>}
      </p>

      <div className="mcq-options">
        {OPTION_KEYS.map(key => {
          const optionText = options[key] ?? '';
          const isCorrectAnswer = feedback?.correct === key;
          const isSelectedWrong = feedback && feedback.selected === key && feedback.correct !== key;

          let stateClass = '';
          if (isCorrectAnswer) stateClass = 'mcq-option--correct';
          else if (isSelectedWrong) stateClass = 'mcq-option--wrong';

          return (
            <button
              key={key}
              type="button"
              className={`mcq-option ${selected === key ? 'mcq-option--selected' : ''} ${stateClass}`}
              onClick={() => { if (!feedback) setSelected(key); }}
              disabled={!!feedback || isLoading}
            >
              <span className="mcq-option__label">{key}</span>
              <span className="mcq-option__text">
                {optionText || <em style={{ color: 'var(--text-muted)' }}>[empty]</em>}
              </span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className={`mcq-feedback ${feedback.is_correct ? 'mcq-feedback--correct' : 'mcq-feedback--wrong'}`}>
          <strong>{feedback.is_correct ? '✓ Correct!' : '✗ Incorrect'}</strong>
          {feedback.explanation && <p style={{ margin: '0.5rem 0 0' }}>{feedback.explanation}</p>}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        {!feedback ? (
          <button type="button" className="btn" onClick={submitAnswer} disabled={!selected || isLoading}>
            Submit Answer
          </button>
        ) : (
          <button type="button" className="btn" onClick={nextQuestion}
            disabled={isLoading || index >= questions.length - 1}>
            Next Question →
          </button>
        )}
      </div>
    </section>
  );
}
