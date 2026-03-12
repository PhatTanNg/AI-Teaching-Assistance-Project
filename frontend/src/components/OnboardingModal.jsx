import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, Mic, BookOpen, Brain, MessageCircle } from 'lucide-react';

const STEPS = [
  {
    icon: '🐒',
    emoji: true,
    title: 'Welcome to AITA!',
    desc: 'Your AI lecture assistant — turn any lecture into notes, flashcards, and quiz questions in seconds.',
    cta: 'Start tour',
    color: '#C8874A',
    bg: 'rgba(200,135,74,0.12)',
    border: 'rgba(200,135,74,0.25)',
  },
  {
    Icon: Mic,
    title: 'Step 1 — Record your lecture',
    desc: 'Hit the mic button to record live, or upload an audio file. AI will transcribe and summarise it for you.',
    cta: 'Next',
    color: '#6EE7F7',
    bg: 'rgba(110,231,247,0.1)',
    border: 'rgba(110,231,247,0.25)',
    path: '/transcribe',
  },
  {
    Icon: BookOpen,
    title: 'Step 2 — Review & learn keywords',
    desc: 'Open any transcript to read the full text and summary. AI extracts key terms automatically — no manual notes needed.',
    cta: 'Next',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.25)',
    path: '/transcripts',
  },
  {
    Icon: Brain,
    title: 'Step 3 — Revise smarter',
    desc: 'Use Flashcards or MCQ quizzes to test yourself. Ask Kiki 🐒 anytime you need a deeper explanation.',
    cta: "Let's go!",
    color: '#4ADE80',
    bg: 'rgba(74,222,128,0.1)',
    border: 'rgba(74,222,128,0.25)',
    path: '/revision',
    final: true,
  },
];

const STORAGE_KEY = 'aita-onboarded';

export function useOnboarding() {
  const [show, setShow] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  };
  return { show, dismiss };
}

export default function OnboardingModal({ onDismiss }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onDismiss();
      navigate('/transcribe');
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Welcome tour">
      <div className="onboarding-card">
        {/* Close */}
        <button className="onboarding-close" onClick={onDismiss} aria-label="Skip tour" type="button">
          <X size={16} />
        </button>

        {/* Step dots */}
        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`onboarding-dot${i === step ? ' onboarding-dot--active' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
              type="button"
            />
          ))}
        </div>

        {/* Icon */}
        <div
          className="onboarding-icon"
          style={{ background: current.bg, border: `1px solid ${current.border}`, color: current.color }}
        >
          {current.emoji ? (
            <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{current.icon}</span>
          ) : (
            <current.Icon size={32} />
          )}
        </div>

        {/* Content */}
        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-desc">{current.desc}</p>

        {/* CTA */}
        <button
          className="onboarding-btn"
          style={{ background: current.color, boxShadow: `0 4px 20px ${current.bg}` }}
          onClick={handleNext}
          type="button"
        >
          {current.cta}
          {!isLast && <ChevronRight size={16} style={{ marginLeft: 4 }} />}
        </button>

        {step === 0 && (
          <button className="onboarding-skip" onClick={onDismiss} type="button">
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
