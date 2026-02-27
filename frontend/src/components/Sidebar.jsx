import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Mic, FileText, BookMarked, Target, LogOut } from 'lucide-react';

const navItems = [
  { icon: Mic,        label: 'Transcribe',  path: '/transcribe' },
  { icon: FileText,   label: 'Transcripts', path: '/transcripts' },
  { icon: BookMarked, label: 'Keywords',    path: '/keywords' },
  { icon: Target,     label: 'Revision',    path: '/revision' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Desktop / Tablet sidebar */}
      <aside className="sidebar">
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon" aria-hidden="true">AI</div>
          <span className="sidebar__logo-text">AITA</span>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
            >
              <span className="sidebar__link-icon">
                <Icon size={20} />
              </span>
              <span className="sidebar__link-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {(user?.displayName?.[0] || user?.username?.[0] || '?').toUpperCase()}
            </div>
            <span className="sidebar__user-name">
              {user?.displayName ?? user?.username}
            </span>
          </div>
          <button className="sidebar__logout" onClick={logout} type="button">
            <LogOut size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `bottom-nav__link${isActive ? ' bottom-nav__link--active' : ''}`
            }
          >
            <span className="bottom-nav__icon"><Icon size={22} /></span>
            <span className="bottom-nav__label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
