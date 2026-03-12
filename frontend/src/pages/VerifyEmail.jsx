import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const VerifyEmail = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Token-verification state
  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Resend state
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        await apiClient(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { method: 'GET' });
        setVerified(true);
      } catch (err) {
        setVerifyError(err.payload?.message || t('auth.verifyExpired'));
      } finally {
        setVerifying(false);
      }
    })();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setResendError('');
    setIsSending(true);
    try {
      await apiClient('/api/auth/resend-verification', { method: 'POST', data: { email } });
      setResendSent(true);
    } catch {
      setResendError(t('common.error'));
    } finally {
      setIsSending(false);
    }
  };

  // ── Token flow ──
  if (token) {
    if (verifying) {
      return (
        <div className="auth-page">
          <div className="auth-card">
            <div className="spinner" style={{ margin: '2rem auto' }} />
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</p>
          </div>
        </div>
      );
    }
    if (verified) {
      return (
        <div className="auth-page">
          <div className="auth-card">
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ marginBottom: '0.5rem' }}>{t('auth.verifySuccess')}</h2>
              <p className="card__subtitle" style={{ marginBottom: '1.5rem' }}>{t('auth.verifySuccessDesc')}</p>
              <Link to="/signin" className="btn btn--sm">{t('auth.signIn')}</Link>
            </div>
          </div>
        </div>
      );
    }
    // Error state — show resend form
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
            <p style={{ color: 'var(--accent-red)', fontSize: '0.9rem' }}>{verifyError}</p>
          </div>
          <ResendForm
            email={email} setEmail={setEmail}
            isSending={isSending} resendSent={resendSent}
            resendError={resendError} onSubmit={handleResend}
            t={t}
          />
        </div>
        <p className="auth-footer"><Link to="/signin">{t('auth.backToSignIn')}</Link></p>
      </div>
    );
  }

  // ── No-token flow (just signed up) ──
  return (
    <div className="auth-page">
      <div className="auth-card">
        {resendSent ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
            <p style={{ color: 'var(--accent-green)', fontSize: '0.9rem' }}>{t('auth.resendSent')}</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📧</div>
              <h2 style={{ marginBottom: '0.5rem' }}>{t('auth.verifyEmailTitle')}</h2>
              <p className="card__subtitle">{t('auth.verifyEmailDesc')}</p>
            </div>
            <ResendForm
              email={email} setEmail={setEmail}
              isSending={isSending} resendSent={resendSent}
              resendError={resendError} onSubmit={handleResend}
              t={t}
            />
          </>
        )}
      </div>
      <p className="auth-footer"><Link to="/signin">{t('auth.backToSignIn')}</Link></p>
    </div>
  );
};

function ResendForm({ email, setEmail, isSending, resendSent, resendError, onSubmit, t }) {
  if (resendSent) return null;
  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{t('auth.resendDesc')}</p>
      {resendError && <p style={{ color: 'var(--accent-red)', fontSize: '0.875rem' }}>{resendError}</p>}
      <input
        type="email"
        className="form-input"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        autoComplete="email"
      />
      <button type="submit" className="btn btn--full btn--ghost btn--sm" disabled={isSending || !email.trim()}>
        {isSending ? t('auth.resending') : t('auth.resendBtn')}
      </button>
    </form>
  );
}

export default VerifyEmail;
