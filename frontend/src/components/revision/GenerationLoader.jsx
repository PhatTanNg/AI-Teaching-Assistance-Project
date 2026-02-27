import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';

const STEPS = {
  mcq: [
    { id: 1, label: 'Reading transcript content',  ms: 1500 },
    { id: 2, label: 'Analyzing key concepts',      ms: 2000 },
    { id: 3, label: 'Generating questions',         ms: 8000 },
    { id: 4, label: 'Validating answers',           ms: 2000 },
    { id: 5, label: 'Saving your quiz set',         ms: 1000 },
  ],
  flashcard: [
    { id: 1, label: 'Reading transcript content',  ms: 1500 },
    { id: 2, label: 'Extracting key concepts',     ms: 2000 },
    { id: 3, label: 'Generating flashcards',        ms: 7000 },
    { id: 4, label: 'Organizing by topic',          ms: 1500 },
    { id: 5, label: 'Saving your flashcard set',    ms: 1000 },
  ],
};

const GenerationLoader = forwardRef(function GenerationLoader(
  { isOpen, type = 'mcq', onComplete },
  ref,
) {
  const steps = STEPS[type] || STEPS.mcq;
  const totalMs = steps.reduce((sum, s) => sum + s.ms, 0);

  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef(null);

  // Expose complete() to parent via ref
  useImperativeHandle(ref, () => ({
    complete() {
      cancelAnimationFrame(timerRef.current);
      setProgress(100);
      setActiveStep(steps.length);
      setDone(true);
      setTimeout(() => onComplete?.(), 600);
    },
  }));

  useEffect(() => {
    if (!isOpen) {
      setActiveStep(0);
      setProgress(0);
      setDone(false);
      return;
    }

    startRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const raw = Math.min((elapsed / totalMs) * 100, 90); // cap at 90%
      setProgress(raw);

      // Advance step pointer
      let cumulative = 0;
      for (let i = 0; i < steps.length; i++) {
        cumulative += steps[i].ms;
        if (elapsed < cumulative) {
          setActiveStep(i);
          break;
        }
        if (i === steps.length - 1) setActiveStep(i);
      }

      if (raw < 90) timerRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timerRef.current);
  }, [isOpen, totalMs, steps]);

  if (!isOpen) return null;

  return (
    <div className="gen-loader-overlay">
      <div className="gen-loader-modal">
        {/* Header */}
        <div className="gen-loader-header">
          <div className="gen-loader-icon">
            {type === 'mcq' ? '❓' : '🃏'}
          </div>
          <h2 className="gen-loader-title">
            {type === 'mcq' ? 'Generating Your MCQ Quiz' : 'Generating Flashcards'}
          </h2>
          <p className="gen-loader-subtitle">
            AI is reading your transcripts and crafting questions…
          </p>
        </div>

        {/* Progress bar */}
        <div className="gen-progress-track">
          <span className="gen-progress-label">{Math.round(progress)}%</span>
          <div
            className="gen-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step list */}
        <ul className="gen-step-list">
          {steps.map((step, i) => {
            const status =
              done ? 'done' :
              i < activeStep ? 'done' :
              i === activeStep ? 'active' :
              'pending';

            return (
              <li key={step.id} className={`gen-step-item gen-step--${status}`}>
                <span className="gen-step-icon">
                  {status === 'done' && '✅'}
                  {status === 'active' && <span className="gen-spinner" />}
                  {status === 'pending' && '○'}
                </span>
                <span className="gen-step-label">{step.label}</span>
              </li>
            );
          })}
        </ul>

        <p className="gen-loader-note">
          This usually takes 10–20 seconds. Please don't close this window.
        </p>
      </div>
    </div>
  );
});

export default GenerationLoader;
