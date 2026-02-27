import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm.jsx';
import { apiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <AuthForm error={error} isSubmitting={isSubmitting} mode="signin" onSubmit={handleSubmit} />
      <p className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link to="/signup">Create one</Link>
      </p>
    </div>
  );
};

export default SignIn;
