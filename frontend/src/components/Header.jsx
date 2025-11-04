import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Header = () => {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="logo">AI</div>
        <div>
          <p className="app-title">AI Teaching Assistant</p>
          <p className="app-subtitle">Empower your study sessions</p>
        </div>
      </div>
      <nav className="app-nav">
        {isAuthenticated ? (
          <>
            <span className="app-nav__user">Hi, {user?.username}</span>
            <button className="btn btn--ghost" onClick={logout} type="button">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="btn btn--ghost" to="/signin">
              Sign in
            </Link>
            <Link className="btn" to="/signup">
              Create account
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
