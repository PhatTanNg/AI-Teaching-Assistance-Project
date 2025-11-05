import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Mic,
  FileText,
  BookMarked,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'Live Transcription',
    description:
      'Capture every spoken word in real time so you can stay focused on learning.',
  },
  {
    icon: Sparkles,
    title: 'Smart Highlights',
    description:
      'Automatically surface the ideas, definitions, and action items that matter most.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by Design',
    description:
      'Keep class recordings and generated transcripts protected within your institution.',
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
      <section className="home__hero card card--wide" aria-labelledby="home-hero-title">
        <div className="home__eyebrow">Smarter note-taking for modern classrooms</div>
        <h1 id="home-hero-title" className="home__title">
          {isAuthenticated
            ? `Welcome back, ${user?.displayName ?? user?.username}!`
            : 'Never miss a lecture again'}
        </h1>
        <p className="home__subtitle">
          Turn spoken lectures into organized, searchable notes automatically.
          Focus on the discussion while we capture and highlight the key ideas for
          you.
        </p>
        <div className="home__actions">
          {isAuthenticated ? (
            <Link className="btn home__cta" to="/transcribe">
              <Mic className="home__cta-icon" aria-hidden="true" />
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
                Sign in to continue
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="home__feature-grid" aria-label="Product highlights">
        {features.map(({ icon: Icon, title, description }) => (
          <article key={title} className="home__feature-card">
            <div className="home__feature-icon" aria-hidden="true">
              <Icon size={24} />
            </div>
            <h2 className="home__feature-title">{title}</h2>
            <p className="home__feature-text">{description}</p>
          </article>
        ))}
      </section>

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
