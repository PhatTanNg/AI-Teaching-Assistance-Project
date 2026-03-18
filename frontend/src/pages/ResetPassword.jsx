import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const ResetPassword = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }
    setError('');
    setIsResetting(true);
    try {
      await apiClient('/api/auth/reset-password', { method: 'POST', data: { token, newPassword } });
      setSuccess(true);
      setTimeout(() => navigate('/signin'), 3000);
    } catch (err) {
      setError(err.payload?.message || t('common.error'));
    } finally {
      setIsResetting(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p style={{ color: 'var(--accent-red)', textAlign: 'center' }}>
            {t('auth.invalidResetLink')}
          </p>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/forgot-password" className="btn btn--sm">{t('auth.forgotPassword')}</Link>
          </div>
        </div>
      </div>
    );
  }

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
        <h2>{t('auth.resetPasswordTitle')}</h2>
        <p className="card__subtitle">{t('auth.resetPasswordDesc')}</p>

        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
            <p style={{ color: 'var(--accent-green)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {t('auth.resetSuccess')}
            </p>
            <Link to="/signin" className="btn btn--sm">{t('auth.signIn')}</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            {error && (
              <p style={{ color: 'var(--accent-red)', fontSize: '0.875rem' }}>{error}</p>
            )}
            <div>
              <label className="form-label">{t('profile.newPassword')}</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t('auth.minCharactersPH')}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="form-label">{t('profile.confirmPassword')}</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t('auth.repeatPasswordPH')}
                required
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn--full" disabled={isResetting || !newPassword || !confirmPassword}>
              {isResetting ? t('auth.resetting') : t('auth.resetBtn')}
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

export default ResetPassword;
