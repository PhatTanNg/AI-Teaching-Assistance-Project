import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

function normalizeOptions(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.A || raw.B || raw.C || raw.D) return raw;
    if (raw.a || raw.b || raw.c || raw.d) {
      return { A: raw.a || '', B: raw.b || '', C: raw.c || '', D: raw.d || '' };
    }
    return raw;
  }
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

function getQuestionText(q) {
  if (!q) return '';
  return q.question || q.content || q.body || q.text || q.title || '';
}

function getResultEmoji(pct) {
  if (pct === 100) return '🏆';
  if (pct >= 80)  return '🌟';
  if (pct >= 60)  return '👍';
  if (pct >= 40)  return '📚';
  return '💪';
}

export default function McqQuiz({ questions, onSubmitBatch, isLoading }) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const currentQuestion = useMemo(
    () => (questions?.length > 0 ? questions[index] : null),
    [questions, index],
  );

  const getResultMsg = (pct) => {
    if (pct === 100) return t('revision.resultMsgPerfect');
    if (pct >= 80)  return t('revision.resultMsgExcellent');
    if (pct >= 60)  return t('revision.resultMsgGood');
    if (pct >= 40)  return t('revision.resultMsgOk');
    return t('revision.resultMsgKeepGoing');
  };

  const restart = () => {
    setIndex(0);
    setSelected('');
    setFeedback(null);
    setCorrectCount(0);
    setDone(false);
  };

  // ── Empty state ──
  if (!currentQuestion && !done) {
    return (
      <section className="card revision-card">
        <h2 className="revision-card__title">{t('revision.mcqTitle')}</h2>
        <p style={{ color: 'var(--text-muted)' }}>{t('revision.noMCQs')}</p>
      </section>
    );
  }

  // ── Results screen ──
  if (done) {
    const total = questions.length;
    const pct = Math.round((correctCount / total) * 100);
    const emoji = getResultEmoji(pct);
    const msg = getResultMsg(pct);

    return (
      <section className="card revision-card">
        <h2 className="revision-card__title">{t('revision.mcqTitle')}</h2>

        <div className="mcq-results">
          <div className="mcq-results__emoji">{emoji}</div>
          <div className="mcq-results__score">
            <span className="mcq-results__num">{correctCount}</span>
            <span className="mcq-results__den">/{total}</span>
          </div>
          <div className="mcq-results__pct">{pct}% {t('revision.correctSuffix')}</div>
          <p className="mcq-results__msg">{msg}</p>

          {/* Thin progress bar */}
          <div className="mcq-progress-bar" style={{ marginBottom: '1.5rem' }}>
            <div
              className="mcq-progress-bar__fill"
              style={{ width: `${pct}%`, background: pct >= 60 ? 'var(--accent-green)' : pct >= 40 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}
            />
          </div>

          <button type="button" className="btn" onClick={restart} style={{ gap: '0.5rem' }}>
            <RotateCcw size={15} /> {t('common.retry')}
          </button>
        </div>
      </section>
    );
  }

  // ── Quiz ──
  const questionText = getQuestionText(currentQuestion);
  const options = normalizeOptions(currentQuestion.options);
  const isLastQuestion = index === questions.length - 1;

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
    if (isLastQuestion) {
      setDone(true);
    } else {
      setSelected('');
      setFeedback(null);
      setIndex(prev => prev + 1);
    }
  };

  return (
    <section className="card revision-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="revision-card__title">{t('revision.mcqTitle')}</h2>
        <span className="mcq-score">
          {correctCount}/{questions.length} {t('revision.correctSuffix')}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <div className="mcq-progress-bar" style={{ flex: 1, margin: 0 }}>
          <div className="mcq-progress-bar__fill" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          {index + 1}/{questions.length}
        </span>
      </div>

      <p className="mcq-question">
        {questionText || <span style={{ color: 'var(--accent-red)', fontStyle: 'italic' }}>[Question text missing]</span>}
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
          <strong>{feedback.is_correct ? t('revision.correctFeedback') : t('revision.incorrectFeedback')}</strong>
          {feedback.explanation && <p style={{ margin: '0.5rem 0 0' }}>{feedback.explanation}</p>}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        {!feedback ? (
          <button type="button" className="btn" onClick={submitAnswer} disabled={!selected || isLoading}>
            {t('revision.submitAnswer')}
          </button>
        ) : (
          <button type="button" className="btn" onClick={nextQuestion} disabled={isLoading}>
            {isLastQuestion ? t('revision.viewResults') : t('revision.nextQuestion')}
          </button>
        )}
      </div>
    </section>
  );
}
