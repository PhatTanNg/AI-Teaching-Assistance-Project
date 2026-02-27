import { Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import Transcribe from './pages/Transcribe.jsx';
import Transcripts from './pages/Transcripts.jsx';
import Keywords from './pages/Keywords.jsx';
import RevisionModePage from './pages/RevisionModePage.jsx';

/* Authenticated layout — sidebar + main content area */
function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main id="main-content" className="app-main" role="main">
        <div className="app-main__content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/* Public layout — simple header + centered content */
function PublicLayout() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="app-public">
      <header className="app-public__header">
        <Link to="/" className="app-public__brand">
          <div className="app-public__brand-icon" aria-hidden="true">AI</div>
          <span className="app-public__brand-name">AITA</span>
        </Link>
        <nav className="app-public__nav">
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
        Built to help students capture every lecture with clarity and confidence.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Routes>
        {/* Public pages (no sidebar) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
        </Route>

        {/* Authenticated pages (sidebar layout) */}
        <Route element={<AppLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route path="/transcribe" element={<Transcribe />} />
            <Route path="/transcripts" element={<Transcripts />} />
            <Route path="/keywords" element={<Keywords />} />
            <Route path="/revision" element={<RevisionModePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
