import { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import MonkeyChat from './components/MonkeyChat.jsx';
import { Toaster } from './components/ui/sonner';
import OnboardingModal, { useOnboarding } from './components/OnboardingModal.jsx';
import ThemeTransition from './components/ThemeTransition.jsx';
const FloatingBackground = lazy(() => import('./components/FloatingBackground.jsx'));
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import Transcribe from './pages/Transcribe.jsx';
import Transcripts from './pages/Transcripts.jsx';
import Keywords from './pages/Keywords.jsx';
import RevisionModePage from './pages/RevisionModePage.jsx';
import Profile from './pages/Profile.jsx';
import MindMapPage from './pages/MindMapPage.jsx';

/* Authenticated layout — sidebar + main content area */
function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';
  const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding();
  const { user, token } = useAuth();
  const [resendingVerify, setResendingVerify] = useState(false);
  const [verifySent, setVerifySent] = useState(false);

  const handleResendVerify = async () => {
    if (!user?.email || resendingVerify) return;
    setResendingVerify(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      if (res.ok) {
        setVerifySent(true);
        setTimeout(() => setVerifySent(false), 5000);
      } else {
        console.error('[ResendVerify] Server error — check backend SMTP configuration');
      }
    } catch (err) {
      console.error('[ResendVerify] Network error:', err);
    } finally {
      setResendingVerify(false);
    }
  };

  return (
    <div className="app-layout">
      <Suspense fallback={null}><FloatingBackground /></Suspense>
      {user && user.emailVerified === false && (
        <div className="email-verify-banner">
          <span>
            ⚠️ Please verify your email address.
            {verifySent ? (
              <span style={{ marginLeft: '0.5rem', opacity: 0.8 }}>Email sent!</span>
            ) : (
              <button
                onClick={handleResendVerify}
                disabled={resendingVerify}
                style={{ marginLeft: '0.5rem', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: 'inherit', fontWeight: 600, padding: 0 }}
              >
                {resendingVerify ? 'Sending...' : 'Resend'}
              </button>
            )}
          </span>
        </div>
      )}
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
      <main
        id="main-content"
        className="app-main"
        role="main"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="app-main__content">
          <Outlet />
        </div>
      </main>
      <MonkeyChat />
      <Toaster position="top-right" richColors />
      {showOnboarding && <OnboardingModal onDismiss={dismissOnboarding} />}
    </div>
  );
}

/* Theme toggle button — used in public header */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme !== 'light';
  return (
    <button
      className="sidebar__theme-btn"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

/* Public layout — simple header + centered content */
function PublicLayout() {
  const { isAuthenticated } = useAuth();
  const [bannerDismissed, setBannerDismissed] = useState(
    () => !!localStorage.getItem('aita-banner-dismissed')
  );

  const dismissBanner = () => {
    localStorage.setItem('aita-banner-dismissed', '1');
    setBannerDismissed(true);
  };

  return (
    <div className="app-public">
      <Suspense fallback={null}><FloatingBackground /></Suspense>
      {!isAuthenticated && !bannerDismissed && (
        <div className="announcement-banner" role="banner">
          <span className="announcement-banner__text">
            🎓 Free for students — record any lecture, AI does the rest
            <span className="announcement-banner__arrow" aria-hidden="true"> →</span>
          </span>
          <button
            className="announcement-banner__close"
            onClick={dismissBanner}
            aria-label="Dismiss announcement"
            type="button"
          >×</button>
        </div>
      )}
      <header className="app-public__header">
        <Link to="/" className="app-public__brand">
          <div className="app-public__brand-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <div className="app-public__brand-text">
            <span className="app-public__brand-name">AITA</span>
            <span className="app-public__brand-tagline">AI lecture assistant</span>
          </div>
        </Link>
        <nav className="app-public__nav">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link className="btn btn--sm" to="/transcribe">Dashboard</Link>
          ) : (
            <>
              <Link className="btn btn--ghost btn--sm" to="/signin">Sign in</Link>
              <Link className="btn btn--sm" to="/signup">Get started</Link>
            </>
          )}
        </nav>
      </header>
      <div className="app-public__main">
        <Outlet />
      </div>
      <footer className="app-public__footer" role="contentinfo">
        <span>Built to help students capture every lecture with clarity and confidence.</span>
        <span style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Privacy Policy</Link>
          <Link to="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>Terms of Service</Link>
        </span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <ThemeTransition />
      <Routes>
        {/* Public pages (no sidebar) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
        </Route>

        {/* Authenticated pages (sidebar layout) */}
        <Route element={<AppLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route path="/transcribe" element={<Transcribe />} />
            <Route path="/transcripts" element={<Transcripts />} />
            <Route path="/keywords" element={<Keywords />} />
            <Route path="/revision" element={<RevisionModePage />} />
            <Route path="/mindmap" element={<MindMapPage />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
