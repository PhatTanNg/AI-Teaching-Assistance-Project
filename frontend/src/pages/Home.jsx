import { useEffect, useRef, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import {
  Mic,
  FileText,
  BookMarked,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Brain,
} from 'lucide-react';

const accentColor = {
  cyan:   'rgba(245,166,35,0.12)',   /* amber — primary */
  purple: 'rgba(167,139,250,0.12)',
  green:  'rgba(45,212,191,0.12)',   /* teal — study features */
};
const accentText = {
  cyan:   'var(--accent-primary)',   /* amber */
  purple: 'var(--accent-purple)',
  green:  'var(--accent-teal)',
};
const accentGradient = {
  cyan:   'linear-gradient(135deg, rgba(245,166,35,0.08) 0%, transparent 60%)',
  purple: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, transparent 60%)',
  green:  'linear-gradient(135deg, rgba(45,212,191,0.07)  0%, transparent 60%)',
};

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const cardsRef = useRef([]);

  const cycleWords = t('home.cycleWords');
  const [cycleIndex, setCycleIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const workflowSteps = [
    { num: '01', label: t('home.step1') },
    { num: '02', label: t('home.step2') },
    { num: '03', label: t('home.step3') },
  ];

  const features = [
    { icon: Mic,        title: t('home.feat1Title'), description: t('home.feat1Desc'), accent: 'cyan' },
    { icon: Sparkles,   title: t('home.feat2Title'), description: t('home.feat2Desc'), accent: 'purple' },
    { icon: ShieldCheck,title: t('home.feat3Title'), description: t('home.feat3Desc'), accent: 'green' },
  ];

  const quickLinks = [
    { to: '/transcripts', title: t('home.quickTranscripts'), description: t('home.quickTranscriptsDesc'), icon: FileText },
    { to: '/keywords',    title: t('home.quickKeywords'),    description: t('home.quickKeywordsDesc'),    icon: BookMarked },
  ];

  useEffect(() => {
    if (isAuthenticated) return;
    const id = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCycleIndex(i => (i + 1) % cycleWords.length);
        setIsFading(false);
      }, 300);
    }, 2500);
    return () => clearInterval(id);
  }, [isAuthenticated, cycleWords.length]);

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
      if (el) { el.style.animationPlayState = 'paused'; observer.observe(el); }
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="home">
      {/* ── Hero ── */}
      <section className="home__hero card card--wide" aria-labelledby="home-hero-title">
        <div className="home__eyebrow">
          {isAuthenticated ? `✦ Welcome back, ${user?.displayName ?? user?.username}` : '✦ AI-powered lecture notes for every student'}
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
              {t('home.heroPrefix')}{' '}
              <span className={`gradient-text home__cycle-word home__cycle-word--${isFading ? 'out' : 'in'}`}>
                {cycleWords[cycleIndex]}
              </span>
              .
            </>
          )}
        </h1>
        <p className="home__subtitle">
          {isAuthenticated
            ? 'Record a lecture → AI extracts keywords → Study with flashcards & quizzes. Simple as that.'
            : t('home.heroSub')}
        </p>
        <div className="home__actions">
          {isAuthenticated ? (
            <Link className="btn home__cta" to="/transcribe">
              <Mic className="home__cta-icon" aria-hidden="true" />
              {t('home.backIn')}
              <ArrowRight className="home__cta-icon" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link className="btn home__cta" to="/signup">
                {t('home.ctaStart')}
                <ArrowRight className="home__cta-icon" aria-hidden="true" />
              </Link>
              <Link className="btn btn--ghost" to="/signin">
                {t('home.ctaSignIn')}
              </Link>
            </>
          )}
        </div>

        {!isAuthenticated && (
          <div className="home__workflow" aria-label="How it works">
            {workflowSteps.map(({ num, label }, i) => (
              <Fragment key={num}>
                <div className="home__workflow-step">
                  <div className="home__workflow-num">{num}</div>
                  <span className="home__workflow-label">{label}</span>
                </div>
                {i < workflowSteps.length - 1 && (
                  <div className="home__workflow-connector" aria-hidden="true" />
                )}
              </Fragment>
            ))}
          </div>
        )}

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
            {t('home.backIn')}
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
