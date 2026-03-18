import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm.jsx';
import { apiClient } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const SignUp = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      setError(err.payload?.message ?? t('auth.signUpFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthForm error={error} isSubmitting={isSubmitting} mode="signup" onSubmit={handleSubmit} />
      <p className="auth-footer" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {t('auth.termsNotice')}{' '}
        <Link to="/terms" style={{ color: 'var(--text-muted)' }}>{t('auth.termsLink')}</Link>
        {' '}{t('auth.and')}{' '}
        <Link to="/privacy" style={{ color: 'var(--text-muted)' }}>{t('auth.privacyLink')}</Link>.
      </p>
      <p className="auth-footer">
        {t('auth.hasAccount')} <Link to="/signin">{t('auth.signIn')}</Link>
      </p>
    </div>
  );
};

export default SignUp;
