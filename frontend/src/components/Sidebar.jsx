import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Mic, FileText, BookMarked, Target, GitFork, LogOut, Moon, Sun, ChevronLeft, ChevronRight, User } from 'lucide-react';

export default function Sidebar({ collapsed = false, onCollapse }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();

  const navItems = useMemo(() => [
    { icon: Mic,        label: t('nav.transcribe'),  path: '/transcribe' },
    { icon: FileText,   label: t('nav.transcripts'), path: '/transcripts' },
    { icon: BookMarked, label: t('nav.keywords'),    path: '/keywords' },
    { icon: Target,     label: t('nav.revision'),    path: '/revision' },
    { icon: GitFork,    label: t('nav.mindmap'),     path: '/mindmap' },
  ], [t]);

  const isDark = theme !== 'light';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  const toggleCollapse = () => onCollapse?.(!collapsed);

  const initials = (user?.displayName?.[0] || user?.username?.[0] || '?').toUpperCase();
  const displayName = user?.displayName ?? user?.username;
  const isImageAvatar = user?.avatarUrl && (user.avatarUrl.startsWith('data:') || user.avatarUrl.startsWith('http'));
  const isEmojiAvatar = user?.avatarUrl && !isImageAvatar;

  return (
    <>
      {/* Desktop / Tablet sidebar */}
      <aside
        className="sidebar"
        style={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
        aria-label="Sidebar navigation"
      >
        {/* Logo */}
        <div className="sidebar__logo" style={collapsed ? { justifyContent: 'center' } : {}}>
          <div className="sidebar__logo-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="5"  cy="12" r="3.5" fill="#C8874A"/>
              <circle cx="5"  cy="12" r="2"   fill="#E8A07A"/>
              <circle cx="21" cy="12" r="3.5" fill="#C8874A"/>
              <circle cx="21" cy="12" r="2"   fill="#E8A07A"/>
              <circle cx="13" cy="13" r="9"   fill="#C8874A"/>
              <ellipse cx="13" cy="16" rx="5.5" ry="4" fill="#E8B07A"/>
              <circle cx="10" cy="11" r="1.5" fill="#2D1B00"/>
              <circle cx="16" cy="11" r="1.5" fill="#2D1B00"/>
              <circle cx="10.6" cy="10.4" r="0.5" fill="white"/>
              <circle cx="16.6" cy="10.4" r="0.5" fill="white"/>
              <ellipse cx="13" cy="15" rx="1.3" ry="0.9" fill="#8B4513"/>
              <path d="M10.5 17.5 Q13 19.5 15.5 17.5" stroke="#5C2D0A" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          {!collapsed && <span className="sidebar__logo-text">AITA</span>}
        </div>

        {/* Nav links */}
        <nav className="sidebar__nav" aria-label="Main navigation">
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}${collapsed ? ' sidebar__link--icon-only' : ''}`
              }
            >
              <span className="sidebar__link-icon">
                <Icon size={20} />
              </span>
              {!collapsed && <span className="sidebar__link-label">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          {/* Controls: avatar + name + theme toggle */}
          <div
            className="sidebar__controls"
            style={collapsed ? { flexDirection: 'column', alignItems: 'center', gap: '0.4rem' } : {}}
          >
            <NavLink
              to="/profile"
              className="sidebar__avatar"
              title={collapsed ? `${displayName} — ${t('nav.profile')}` : t('nav.profile')}
              aria-label={`${t('nav.profile')}: ${displayName}`}
              style={{ textDecoration: 'none' }}
            >
              {isImageAvatar ? (
                <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : isEmojiAvatar ? (
                <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{user.avatarUrl}</span>
              ) : initials}
            </NavLink>
            {!collapsed && (
              <NavLink to="/profile" style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
                <span className="sidebar__user-name">
                  {displayName}
                </span>
              </NavLink>
            )}
            <button
              className="sidebar__theme-btn"
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
              type="button"
              aria-label={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
              style={{ fontSize: '13px', fontWeight: 600 }}
            >
              {lang === 'vi' ? '🇬🇧' : '🇻🇳'}
            </button>
            <button
              className="sidebar__theme-btn"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              type="button"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={collapsed ? {} : { marginLeft: 'auto' }}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {!collapsed ? (
            <button className="sidebar__logout" onClick={logout} type="button">
              <LogOut size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
              {t('nav.logout')}
            </button>
          ) : (
            <button
              className="sidebar__logout"
              onClick={logout}
              title="Log out"
              type="button"
              style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Collapse toggle — fixed so it's never clipped by sidebar overflow */}
      <button
        className="sidebar__collapse-btn"
        onClick={toggleCollapse}
        style={{ left: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        type="button"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

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
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `bottom-nav__link${isActive ? ' bottom-nav__link--active' : ''}`
          }
        >
          <span className="bottom-nav__icon"><User size={22} /></span>
          <span className="bottom-nav__label">{t('nav.profile')}</span>
        </NavLink>
      </nav>
    </>
  );
}
