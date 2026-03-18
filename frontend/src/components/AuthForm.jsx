import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';

const AuthForm = ({ mode = 'signin', onSubmit, isSubmitting, error }) => {
  const { t } = useLanguage();
  const isSignUp = mode === 'signup';
  const [formValues, setFormValues] = useState({
    usernameOrEmail: '',
    password: '',
    confirmPassword: '',
    username: '',
    email: '',
    displayName: '',
  });
  const [confirmError, setConfirmError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const passwordOk = (pw) => pw.length >= 8 && /[0-9!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]/.test(pw);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (name === 'confirmPassword' || name === 'password') {
      setConfirmError('');
      setPasswordError('');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSignUp) {
      if (!passwordOk(formValues.password)) {
        setPasswordError(t('auth.passwordRequirements'));
        return;
      }
      if (formValues.password !== formValues.confirmPassword) {
        setConfirmError(t('auth.confirmPasswordMismatch'));
        return;
      }
    }
    onSubmit(formValues);
  };

  return (
    <div className="auth-card-wrapper">
    <form className="auth-card" onSubmit={handleSubmit}>
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

      <h2>{isSignUp ? t('auth.createAccount') : t('auth.welcome')}</h2>
      <p className="card__subtitle">
        {isSignUp ? t('auth.signUpDesc') : t('auth.signInDesc')}
      </p>

      {isSignUp ? (
        <>
          <label className="form-label" htmlFor="displayName">{t('auth.displayName')}</label>
          <input id="displayName" name="displayName" type="text"
            placeholder={t('auth.displayNamePH')} value={formValues.displayName}
            onChange={handleChange} required className="form-input" />

          <label className="form-label" htmlFor="username">{t('auth.username')}</label>
          <input id="username" name="username" type="text"
            placeholder={t('auth.usernamePH')} value={formValues.username}
            onChange={handleChange} required className="form-input" autoComplete="username" />

          <label className="form-label" htmlFor="email">{t('auth.email')}</label>
          <input id="email" name="email" type="email"
            placeholder={t('auth.emailPH')} value={formValues.email}
            onChange={handleChange} required className="form-input" autoComplete="email" />
        </>
      ) : (
        <>
          <label className="form-label" htmlFor="usernameOrEmail">{t('auth.usernameOrEmail')}</label>
          <input id="usernameOrEmail" name="usernameOrEmail" type="text"
            placeholder={t('auth.usernameOrEmailPH')} value={formValues.usernameOrEmail}
            onChange={handleChange} required className="form-input" autoComplete="username" />
        </>
      )}

      <label className="form-label" htmlFor="password">{t('auth.password')}</label>
      <input id="password" name="password" type="password"
        placeholder={t('auth.passwordPH')} value={formValues.password}
        onChange={handleChange} required className="form-input"
        autoComplete={isSignUp ? 'new-password' : 'current-password'} />
      {isSignUp && (
        <p style={{ fontSize: '0.75rem', color: passwordError ? 'var(--accent-red)' : 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
          {passwordError || t('auth.passwordHint')}
        </p>
      )}

      {isSignUp && (
        <>
          <label className="form-label" htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
          <input id="confirmPassword" name="confirmPassword" type="password"
            placeholder={t('auth.confirmPasswordPH')} value={formValues.confirmPassword}
            onChange={handleChange} required className="form-input"
            autoComplete="new-password" />
          {confirmError && <p className="form-error" role="alert">{confirmError}</p>}
        </>
      )}

      {isSignUp && (
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer', marginTop: '0.25rem' }}>
          <input type="checkbox" required style={{ marginTop: '3px', accentColor: 'var(--accent-primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {t('auth.agreePrefix')}{' '}
            <Link to="/terms" style={{ color: 'var(--text-secondary)' }}>{t('auth.termsLink')}</Link>
            {' '}{t('auth.and')}{' '}
            <Link to="/privacy" style={{ color: 'var(--text-secondary)' }}>{t('auth.privacyLink')}</Link>
          </span>
        </label>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="btn btn--full" disabled={isSubmitting} type="submit">
        {isSubmitting ? t('auth.processing') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
      </button>
    </form>
    </div>
  );
};

export default AuthForm;
