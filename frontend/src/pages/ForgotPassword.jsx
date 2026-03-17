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
        <div className="auth-brand-mark">
          <div className="auth-brand-mark__icon">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <ellipse cx="20" cy="22" rx="12" ry="11" fill="#7A3F1E"/>
              <ellipse cx="20" cy="22" rx="9" ry="8" fill="#C8874A"/>
              <ellipse cx="14" cy="17" rx="4" ry="4.5" fill="#7A3F1E"/>
              <ellipse cx="26" cy="17" rx="4" ry="4.5" fill="#7A3F1E"/>
              <circle cx="14" cy="16" r="2.5" fill="#F0D0A0"/>
              <circle cx="26" cy="16" r="2.5" fill="#F0D0A0"/>
              <circle cx="14.5" cy="15.5" r="1.2" fill="#1a0800"/>
              <circle cx="26.5" cy="15.5" r="1.2" fill="#1a0800"/>
              <ellipse cx="20" cy="25" rx="4" ry="2.5" fill="#F0D0A0"/>
              <ellipse cx="10" cy="21" rx="3" ry="3.5" fill="#C8874A"/>
              <ellipse cx="30" cy="21" rx="3" ry="3.5" fill="#C8874A"/>
            </svg>
          </div>
          <span className="auth-brand-mark__name">AITA</span>
        </div>
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
