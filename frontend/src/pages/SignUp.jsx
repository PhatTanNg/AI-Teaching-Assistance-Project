import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm.jsx';
import { apiClient } from '../api/client.js';

const SignUp = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async ({ username, email, password, displayName }) => {
    setError('');
    setIsSubmitting(true);
    try {
      await apiClient('/api/auth/signup', {
        method: 'POST',
        data: { username, email, password, displayName },
      });
      navigate('/verify-email', { replace: true });
    } catch (err) {
      setError(err.payload?.message ?? 'Unable to sign up. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthForm error={error} isSubmitting={isSubmitting} mode="signup" onSubmit={handleSubmit} />
      <p className="auth-footer" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        By signing up, you agree to our{' '}
        <Link to="/terms" style={{ color: 'var(--text-muted)' }}>Terms of Service</Link>
        {' '}and{' '}
        <Link to="/privacy" style={{ color: 'var(--text-muted)' }}>Privacy Policy</Link>.
      </p>
      <p className="auth-footer">
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
    </div>
  );
};

export default SignUp;
