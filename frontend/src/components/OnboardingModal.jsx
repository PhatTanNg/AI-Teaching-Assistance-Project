import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, Mic, BookOpen, Brain, MessageCircle } from 'lucide-react';

const STEPS = [
  {
    icon: '🐒',
    emoji: true,
    title: 'Chào mừng đến với AITA!',
    desc: 'Trợ lý học tập AI — giúp bạn biến bài giảng thành ghi chú, flashcard và câu hỏi ôn tập trong vài giây.',
    cta: 'Bắt đầu tour',
    color: '#C8874A',
    bg: 'rgba(200,135,74,0.12)',
    border: 'rgba(200,135,74,0.25)',
  },
  {
    Icon: Mic,
    title: 'Bước 1 — Ghi âm bài giảng',
    desc: 'Bấm nút micro để ghi âm trực tiếp, hoặc tải file audio lên. AI sẽ tự động phiên âm và tóm tắt cho bạn.',
    cta: 'Tiếp theo',
    color: '#6EE7F7',
    bg: 'rgba(110,231,247,0.1)',
    border: 'rgba(110,231,247,0.25)',
    path: '/transcribe',
  },
  {
    Icon: BookOpen,
    title: 'Bước 2 — Ôn lại & học từ khoá',
    desc: 'Mở bài ghi để đọc phiên âm và tóm tắt. AI tự trích xuất từ khoá quan trọng — không cần ghi chú tay.',
    cta: 'Tiếp theo',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.1)',
    border: 'rgba(167,139,250,0.25)',
    path: '/transcripts',
  },
  {
    Icon: Brain,
    title: 'Bước 3 — Ôn tập thông minh',
    desc: 'Dùng Flashcard hoặc MCQ để kiểm tra kiến thức. Hỏi Kiki 🐒 bất cứ lúc nào nếu cần giải thích thêm.',
    cta: 'Bắt đầu thôi!',
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
            Bỏ qua
          </button>
        )}
      </div>
    </div>
  );
}
