import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm.jsx';
import { apiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState('');

  useEffect(() => {
    try {
      if (sessionStorage.getItem('session_expired')) {
        setSessionExpiredMsg('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        sessionStorage.removeItem('session_expired');
      }
    } catch (e) { /* ignore */ }
  }, []);

  const handleSubmit = async ({ usernameOrEmail, password }) => {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await apiClient('/api/auth/signin', {
        method: 'POST',
        data: { usernameOrEmail, password },
      });
      login(response);
      navigate('/transcribe');
    } catch (err) {
      setError(err.payload?.message ?? 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      {sessionExpiredMsg && (
        <div style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--accent-yellow, #F5A623)' }}>
          {sessionExpiredMsg}
        </div>
      )}
      <AuthForm error={error} isSubmitting={isSubmitting} mode="signin" onSubmit={handleSubmit} />
      <p className="auth-footer" style={{ textAlign: 'center' }}>
        <Link to="/forgot-password" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Forgot password?</Link>
      </p>
      <p className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link to="/signup">Create one</Link>
      </p>
    </div>
  );
};

export default SignIn;
