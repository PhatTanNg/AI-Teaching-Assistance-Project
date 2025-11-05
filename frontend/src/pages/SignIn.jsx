import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm.jsx';
import { apiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Container } from '../components/ui/container';

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
      navigate('/dashboard');
    } catch (err) {
      setError(err.payload?.message ?? 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="w-full max-w-md space-y-4">
        <AuthForm error={error} isSubmitting={isSubmitting} mode="signin" onSubmit={handleSubmit} />
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="underline underline-offset-4 hover:text-primary">
            Create one
          </Link>
        </p>
      </div>
    </Container>
  );
};

export default SignIn;
