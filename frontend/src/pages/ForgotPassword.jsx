import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const ForgotPassword = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setIsSending(true);
    try {
      await apiClient('/api/auth/forgot-password', { method: 'POST', data: { email } });
      setSent(true);
    } catch {
      setError(t('common.error'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>{t('auth.forgotPasswordTitle')}</h2>
        <p className="card__subtitle">{t('auth.forgotPasswordDesc')}</p>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
            <p style={{ color: 'var(--accent-green)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {t('auth.resetSent')}
            </p>
            <Link to="/signin" className="btn btn--sm btn--ghost">{t('auth.backToSignIn')}</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            {error && (
              <p style={{ color: 'var(--accent-red)', fontSize: '0.875rem' }}>{error}</p>
            )}
            <div>
              <label className="form-label">{t('auth.email')}</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" className="btn btn--full" disabled={isSending || !email.trim()}>
              {isSending ? t('auth.sending') : t('auth.sendReset')}
            </button>
          </form>
        )}
      </div>
      <p className="auth-footer">
        <Link to="/signin">{t('auth.backToSignIn')}</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
