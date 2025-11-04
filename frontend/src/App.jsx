import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import Profile from './pages/Profile.jsx';
import { useAuth } from './context/AuthContext.jsx';

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<Profile />} path="/dashboard" />
          </Route>
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/signin" replace />}
          />
          <Route element={<SignIn />} path="/signin" />
          <Route element={<SignUp />} path="/signup" />
          <Route element={<Navigate to="/" replace />} path="*" />
        </Routes>
      </main>
      <footer className="app-footer">
        <p>Built to showcase the AI Teaching Assistant backend.</p>
        <p className="app-footer__note">Configure the API URL via VITE_API_BASE_URL.</p>
      </footer>
    </div>
  );
};

export default App;
