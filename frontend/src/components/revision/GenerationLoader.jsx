import { useEffect, useState, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

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

const FUN_COPY = [
  'Asking the AI very nicely… 🙏',
  'Brewing your study material ☕',
  'Turning lecture chaos into clarity ✨',
  'Almost there, hang tight! 🚀',
  'The AI is thinking hard for you 🤔',
  'Making studying a little less painful 📚',
];

const GenerationLoader = forwardRef(function GenerationLoader(
  { isOpen, type = 'mcq', onComplete },
  ref,
) {
  const steps = STEPS[type] || STEPS.mcq;
  const totalMs = steps.reduce((sum, s) => sum + s.ms, 0);

  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [funCopyIdx, setFunCopyIdx] = useState(0);

  const progressIntervalRef = useRef(null);
  const stepTimersRef = useRef([]);
  const funCopyTimerRef = useRef(null);
  const startTimeRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    stepTimersRef.current.forEach(clearTimeout);
    stepTimersRef.current = [];
    if (funCopyTimerRef.current) {
      clearInterval(funCopyTimerRef.current);
      funCopyTimerRef.current = null;
    }
  }, []);

  useImperativeHandle(ref, () => ({
    complete() {
      clearAllTimers();
      setProgress(100);
      setActiveStep(steps.length);
      setDone(true);
      setTimeout(() => onComplete?.(), 600);
    },
  }), [steps.length, onComplete, clearAllTimers]);

  useEffect(() => {
    if (!isOpen) {
      clearAllTimers();
      setActiveStep(0);
      setProgress(0);
      setDone(false);
      setFunCopyIdx(0);
      return;
    }

    setActiveStep(0);
    setProgress(0);
    setDone(false);
    setFunCopyIdx(0);

    startTimeRef.current = Date.now();

    // Progress bar
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / totalMs) * 100, 90);
      setProgress(pct);
      if (pct >= 90) clearInterval(progressIntervalRef.current);
    }, 100);

    // Step advancement
    let cumulative = 0;
    stepTimersRef.current = steps.map((step, index) => {
      cumulative += step.ms;
      return setTimeout(() => {
        setActiveStep(index + 1);
      }, cumulative);
    });

    // Fun copy rotation
    funCopyTimerRef.current = setInterval(() => {
      setFunCopyIdx(i => (i + 1) % FUN_COPY.length);
    }, 3000);

    return () => clearAllTimers();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const getStatus = (index) => {
    if (done) return 'done';
    if (index < activeStep) return 'done';
    if (index === activeStep) return 'active';
    return 'pending';
  };

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
          <p className="gen-loader-fun-copy" key={funCopyIdx}>
            {FUN_COPY[funCopyIdx]}
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="gen-progress-pct">{Math.round(progress)}%</div>
          <div className="gen-progress-track">
            <div
              className="gen-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step list */}
        <ul className="gen-step-list">
          {steps.map((step, i) => {
            const status = getStatus(i);
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
          Usually takes 10–20 seconds. Don't close this window ✌️
        </p>
      </div>
    </div>
  );
});

export default GenerationLoader;
