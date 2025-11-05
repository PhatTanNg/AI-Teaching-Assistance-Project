import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  ArrowRight,
  BookMarked,
  FileText,
  Highlighter,
  Mic,
  NotebookPen,
  Sparkles,
} from 'lucide-react';

const heroHighlights = [
  {
    icon: Mic,
    title: 'Live transcription',
    description: 'Convert speech to text in real time with high accuracy.',
  },
  {
    icon: Sparkles,
    title: 'Smart keywords',
    description: 'Automatically highlight the concepts you need to review.',
  },
  {
    icon: Highlighter,
    title: 'Definition lookup',
    description: 'See key terms and their definitions without leaving class.',
  },
];

const panelFeatures = [
  {
    icon: Mic,
    title: 'Live Transcription',
    description: 'Follow along as your lecture becomes readable notes instantly.',
  },
  {
    icon: Sparkles,
    title: 'Keyword Highlighting',
    description: 'Important topics are surfaced and saved for effortless studying later.',
  },
  {
    icon: NotebookPen,
    title: 'AI Study Summaries',
    description: 'Receive concise recaps of every session to kick-start revision.',
  },
];

const quickLinks = [
  {
    to: '/transcripts',
    title: 'View Transcripts',
    description: 'Browse every lecture you have captured so far.',
    icon: FileText,
  },
  {
    to: '/keywords',
    title: 'Saved Keywords',
    description: 'Revisit highlighted concepts and their definitions.',
    icon: BookMarked,
  },
];

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="home">
      <div className="home__layout">
        <section className="home__hero" aria-labelledby="home-hero-title">
          <div className="home__hero-badge" aria-hidden="true">
            <span className="home__hero-dot" />
            AI Teaching Assistant
          </div>
          <h1 id="home-hero-title" className="home__title">
            {isAuthenticated
              ? `Welcome back, ${user?.displayName ?? user?.username}!`
              : 'Never Miss a Lecture Again'}
          </h1>
          <p className="home__subtitle">
            Real-time lecture transcription with AI-powered keyword highlighting.
            Capture every important moment and review key concepts anytime.
          </p>
          <div className="home__actions">
            {isAuthenticated ? (
              <Link className="btn home__cta" to="/transcribe">
                Start a live session
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
          <ul className="home__feature-list">
            {heroHighlights.map(({ icon: Icon, title, description }) => (
              <li key={title} className="home__feature-item">
                <span className="home__feature-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="home__feature-item-title">{title}</p>
                  <p className="home__feature-item-text">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="home__panel" aria-label="Feature preview">
          <div className="home__panel-header">
            <div className="home__panel-chip">Classroom session</div>
            <p className="home__panel-title">AI tools working while you teach</p>
            <p className="home__panel-text">
              Transcribe, highlight, and summarise every lecture from one simple
              workspace.
            </p>
          </div>
          <div className="home__panel-cards">
            {panelFeatures.map(({ icon: Icon, title, description }) => (
              <div key={title} className="home__panel-card">
                <span className="home__panel-icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="home__panel-card-title">{title}</p>
                  <p className="home__panel-card-text">{description}</p>
                </div>
              </div>
            ))}
          </div>
          {!isAuthenticated && (
            <p className="home__panel-cta">
              Already have an account?{' '}
              <Link to="/signin">Sign in to your dashboard</Link>
            </p>
          )}
        </aside>
      </div>

      {isAuthenticated && (
        <section className="home__quick-links" aria-label="Quick links">
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
        </section>
      )}
    </div>
  );
};

export default Home;
