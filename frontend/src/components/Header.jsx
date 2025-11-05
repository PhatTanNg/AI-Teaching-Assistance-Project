import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const authedLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/transcribe', label: 'Transcribe' },
  { to: '/transcripts', label: 'Transcripts' },
  { to: '/keywords', label: 'Keywords' },
];

const unauthLinks = [
  { to: '/', label: 'Home', end: true },
];

const renderLink = ({ to, label, end }) => (
  <NavLink
    key={to}
    to={to}
    end={end}
    className={({ isActive }) =>
      `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
    }
  >
    {label}
  </NavLink>
);

const Header = () => {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="logo" aria-hidden="true">
          AI
        </div>
        <div>
          <p className="app-title">AI Teaching Assistant</p>
          <p className="app-subtitle">Empower your study sessions</p>
        </div>
      </div>
      <div className="app-header__actions">
        <nav className="app-nav" aria-label="Primary navigation">
          {(isAuthenticated ? authedLinks : unauthLinks).map((link) =>
            renderLink(link),
          )}
        </nav>
        {isAuthenticated ? (
          <div className="app-nav__controls">
            <span className="app-nav__user">
              Hi, {user?.displayName ?? user?.username}
            </span>
            <button className="btn btn--ghost" onClick={logout} type="button">
              Log out
            </button>
          </div>
        ) : (
          <div className="app-nav__controls">
            <Link className="btn btn--ghost" to="/signin">
              Sign in
            </Link>
            <Link className="btn" to="/signup">
              Create account
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
