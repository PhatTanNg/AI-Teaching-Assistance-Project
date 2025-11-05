import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import Transcribe from './pages/Transcribe.jsx';
import Transcripts from './pages/Transcripts.jsx';
import Keywords from './pages/Keywords.jsx';

export default function App() {
  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-white">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/transcribe" element={<Transcribe />} />
            <Route path="/transcripts" element={<Transcripts />} />
            <Route path="/keywords" element={<Keywords />} />
          </Route>
        </Routes>
      </main>
=======
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="app-main" role="main">
        <div className="app-main__content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/transcribe" element={<Transcribe />} />
              <Route path="/transcripts" element={<Transcripts />} />
              <Route path="/keywords" element={<Keywords />} />
            </Route>
          </Routes>
        </div>
      </main>
      <footer className="app-footer" role="contentinfo">
        <p>
          Built to help students capture every lecture with clarity and confidence.
        </p>
        <p className="app-footer__note">
          Need support? Reach out to your instructor or administrator for access.
        </p>
      </footer>
>>>>>>> 4af2ec74959e64b1e98761e1dc284df4a265c5a0
    </div>
  );
}
