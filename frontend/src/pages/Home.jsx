import { useEffect, useRef, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Mic,
  FileText,
  BookMarked,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Brain,
} from 'lucide-react';

const CYCLE_WORDS = ['notes', 'flashcards', 'quizzes'];
const WORKFLOW_STEPS = [
  { num: '01', label: 'Record' },
  { num: '02', label: 'Transcribe' },
  { num: '03', label: 'Revise' },
];

const features = [
  {
    icon: Mic,
    title: 'Live Transcription',
    description: 'Record your lecture, get text in real time. Stay focused on the discussion — we handle the notes.',
    accent: 'cyan',
  },
  {
    icon: Sparkles,
    title: 'Smart Highlights',
    description: 'AI surfaces the key ideas, definitions, and action items so nothing gets lost.',
    accent: 'purple',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by Design',
    description: 'Your recordings stay private and protected. No data leaks.',
    accent: 'green',
  },
];

const quickLinks = [
  {
    to: '/transcripts',
    title: 'View Transcripts',
    description: 'Browse every lecture you have captured.',
    icon: FileText,
  },
  {
    to: '/keywords',
    title: 'Saved Keywords',
    description: 'Revisit highlighted concepts and definitions.',
    icon: BookMarked,
  },
];

const accentColor = {
  cyan:   'rgba(110,231,247,0.12)',
  purple: 'rgba(167,139,250,0.12)',
  green:  'rgba(74,222,128,0.12)',
};
const accentText = {
  cyan:   'var(--accent-primary)',
  purple: 'var(--accent-purple)',
  green:  'var(--accent-green)',
};
const accentGradient = {
  cyan:   'linear-gradient(135deg, rgba(110,231,247,0.07) 0%, transparent 60%)',
  purple: 'linear-gradient(135deg, rgba(167,139,250,0.07) 0%, transparent 60%)',
  green:  'linear-gradient(135deg, rgba(74,222,128,0.07)  0%, transparent 60%)',
};

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const cardsRef = useRef([]);

  // Word cycling state
  const [cycleIndex, setCycleIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;
    const id = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCycleIndex(i => (i + 1) % CYCLE_WORDS.length);
        setIsFading(false);
      }, 300);
    }, 2500);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  // Scroll-based fade-in on feature cards
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const cards = cardsRef.current;
    cards.forEach((el) => {
      if (el) {
        el.style.animationPlayState = 'paused';
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="home">
      {/* ── Hero ── */}
      <section className="home__hero card card--wide" aria-labelledby="home-hero-title">
        <div className="home__eyebrow">
          {isAuthenticated ? `👋 Hey, ${user?.displayName ?? user?.username}!` : '✦ Smarter note-taking for modern students'}
        </div>
        <h1 id="home-hero-title" className="home__title">
          {isAuthenticated ? (
            <>
              Ready to{' '}
              <span className="gradient-text">ace today's</span>{' '}
              lecture?
            </>
          ) : (
            <>
              Never miss your{' '}
              <span className={`gradient-text home__cycle-word home__cycle-word--${isFading ? 'out' : 'in'}`}>
                {CYCLE_WORDS[cycleIndex]}
              </span>
              .
            </>
          )}
        </h1>
        <p className="home__subtitle">
          {isAuthenticated
            ? 'Record → AI extracts keywords → Study with flashcards & quizzes. That easy.'
            : 'Record lectures → AI does the boring stuff → You ace the exam. It really is that simple.'}
        </p>
        <div className="home__actions">
          {isAuthenticated ? (
            <Link className="btn home__cta" to="/transcribe">
              <Mic className="home__cta-icon" aria-hidden="true" />
              Start recording
              <ArrowRight className="home__cta-icon" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link className="btn home__cta" to="/signup">
                Get started free
                <ArrowRight className="home__cta-icon" aria-hidden="true" />
              </Link>
              <Link className="btn btn--ghost" to="/signin">
                Sign in
              </Link>
            </>
          )}
        </div>

        {/* How it works */}
        {!isAuthenticated && (
          <div className="home__workflow" aria-label="How it works">
            {WORKFLOW_STEPS.map(({ num, label }, i) => (
              <Fragment key={num}>
                <div className="home__workflow-step">
                  <div className="home__workflow-num">{num}</div>
                  <span className="home__workflow-label">{label}</span>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className="home__workflow-connector" aria-hidden="true" />
                )}
              </Fragment>
            ))}
          </div>
        )}

        {/* Decorative stat pills */}
        {!isAuthenticated && (
          <div className="home__stats">
            <span className="home__stat-pill">🎙️ Real-time transcription</span>
            <span className="home__stat-pill">🃏 Auto flashcards</span>
            <span className="home__stat-pill">📝 MCQ quizzes</span>
          </div>
        )}
      </section>

      {/* ── Bento Feature Grid ── */}
      <section className="home__feature-grid" aria-label="Product highlights">
        {features.map(({ icon: Icon, title, description, accent }, i) => (
          <article
            key={title}
            className="home__feature-card animate-fade-up"
            ref={(el) => { cardsRef.current[i] = el; }}
            style={{ animationDelay: `${i * 0.08}s`, '--card-accent-gradient': accentGradient[accent] }}
          >
            <div
              className="home__feature-icon"
              aria-hidden="true"
              style={{ background: accentColor[accent], color: accentText[accent] }}
            >
              <Icon size={22} />
            </div>
            <div>
              <h2 className="home__feature-title">{title}</h2>
              <p className="home__feature-text">{description}</p>
            </div>
            <span className="home__feature-arrow" aria-hidden="true">→</span>
          </article>
        ))}
      </section>

      {/* ── Quick Links (authenticated only) ── */}
      {isAuthenticated && (
        <section className="home__quick-links" aria-label="Quick links">
          <h2 className="home__section-label">
            <Brain size={16} aria-hidden="true" />
            Jump back in
          </h2>
          <div className="home__quick-grid">
            {quickLinks.map(({ to, title, description, icon: Icon }) => (
              <Link key={to} className="home__quick-card" to={to}>
                <div className="home__quick-card-icon" aria-hidden="true">
                  <Icon size={22} />
                </div>
                <div className="home__quick-card-content">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <ArrowRight className="home__quick-card-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
