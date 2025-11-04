import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm.jsx';
import { apiClient } from '../api/client.js';

const SignUp = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async ({ username, email, password }) => {
    setError('');
    setIsSubmitting(true);
    try {
      await apiClient('/api/auth/signup', {
        method: 'POST',
        data: { username, email, password },
      });
      navigate('/signin', { replace: true, state: { fromSignUp: true } });
    } catch (err) {
      setError(err.payload?.message ?? 'Unable to sign up. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <AuthForm error={error} isSubmitting={isSubmitting} mode="signup" onSubmit={handleSubmit} />
      <p className="card__meta">
        Already have an account? <Link to="/signin">Sign in</Link>.
      </p>
    </div>
  );
};

export default SignUp;
