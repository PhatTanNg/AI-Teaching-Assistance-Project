import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, Mic, BookOpen, Brain, MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const STEP_META = [
  { icon: '🐒', emoji: true, color: '#C8874A', bg: 'rgba(200,135,74,0.12)', border: 'rgba(200,135,74,0.25)' },
  { Icon: Mic,            color: '#6EE7F7', bg: 'rgba(110,231,247,0.1)',  border: 'rgba(110,231,247,0.25)', path: '/transcribe' },
  { Icon: BookOpen,       color: '#A78BFA', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.25)', path: '/transcripts' },
  { Icon: Brain,          color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.25)',  path: '/revision' },
  { Icon: MessageCircle,  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)',  path: '/transcribe', final: true },
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
  const { t } = useLanguage();

  const STEPS = STEP_META.map((meta, i) => ({
    ...meta,
    title: t(`onboarding.step${i}Title`),
    desc:  t(`onboarding.step${i}Desc`),
    cta:   t(`onboarding.step${i}Cta`),
  }));

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
        <button className="onboarding-close" onClick={onDismiss} aria-label={t('onboarding.skip')} type="button">
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
            {t('onboarding.skip')}
          </button>
        )}
      </div>
    </div>
  );
}
