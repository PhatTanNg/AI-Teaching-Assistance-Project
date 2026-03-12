import { useState } from 'react';
import { Link } from 'react-router-dom';

const AuthForm = ({ mode = 'signin', onSubmit, isSubmitting, error }) => {
  const isSignUp = mode === 'signup';
  const [formValues, setFormValues] = useState({
    usernameOrEmail: '',
    password: '',
    username: '',
    email: '',
    displayName: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formValues);
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <h2>{isSignUp ? 'Create an account' : 'Welcome back'}</h2>
      <p className="card__subtitle">
        {isSignUp
          ? 'Sign up to manage your study assistants and track progress.'
          : 'Sign in with your account to continue where you left off.'}
      </p>

      {isSignUp ? (
        <>
          <label className="form-label" htmlFor="displayName">Display name</label>
          <input id="displayName" name="displayName" type="text"
            placeholder="Jackson Nguyen" value={formValues.displayName}
            onChange={handleChange} required className="form-input" />

          <label className="form-label" htmlFor="username">Username</label>
          <input id="username" name="username" type="text"
            placeholder="jacksonn" value={formValues.username}
            onChange={handleChange} required className="form-input" autoComplete="username" />

          <label className="form-label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email"
            placeholder="you@example.com" value={formValues.email}
            onChange={handleChange} required className="form-input" autoComplete="email" />
        </>
      ) : (
        <>
          <label className="form-label" htmlFor="usernameOrEmail">Username or email</label>
          <input id="usernameOrEmail" name="usernameOrEmail" type="text"
            placeholder="jacksonn or you@example.com" value={formValues.usernameOrEmail}
            onChange={handleChange} required className="form-input" autoComplete="username" />
        </>
      )}

      <label className="form-label" htmlFor="password">Password</label>
      <input id="password" name="password" type="password"
        placeholder="Your secure password" value={formValues.password}
        onChange={handleChange} required className="form-input"
        autoComplete={isSignUp ? 'new-password' : 'current-password'} />

      {isSignUp && (
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer', marginTop: '0.25rem' }}>
          <input type="checkbox" required style={{ marginTop: '3px', accentColor: 'var(--accent-primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            I agree to the{' '}
            <Link to="/terms" style={{ color: 'var(--text-secondary)' }}>Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</Link>
          </span>
        </label>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="btn btn--full" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Processing…' : isSignUp ? 'Sign up' : 'Sign in'}
      </button>
    </form>
  );
};

export default AuthForm;
