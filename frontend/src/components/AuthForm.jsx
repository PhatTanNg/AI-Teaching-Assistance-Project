import { useState } from 'react';

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
    <form className="card" onSubmit={handleSubmit}>
      <h2 className="card__title">{isSignUp ? 'Create an account' : 'Welcome back'}</h2>
      <p className="card__subtitle">
        {isSignUp
          ? 'Sign up to manage your study assistants and track progress.'
          : 'Sign in with your account to continue where you left off.'}
      </p>

      {isSignUp ? (
        <>
          <label className="form-label" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="Jordan Smith"
            value={formValues.displayName}
            onChange={handleChange}
            required
            className="form-input"
          />

          <label className="form-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="jordansmith"
            value={formValues.username}
            onChange={handleChange}
            required
            className="form-input"
            autoComplete="username"
          />

          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formValues.email}
            onChange={handleChange}
            required
            className="form-input"
            autoComplete="email"
          />
        </>
      ) : (
        <>
          <label className="form-label" htmlFor="usernameOrEmail">
            Username or email
          </label>
          <input
            id="usernameOrEmail"
            name="usernameOrEmail"
            type="text"
            placeholder="jordansmith or you@example.com"
            value={formValues.usernameOrEmail}
            onChange={handleChange}
            required
            className="form-input"
            autoComplete="username"
          />
        </>
      )}

      <label className="form-label" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        placeholder="Your secure password"
        value={formValues.password}
        onChange={handleChange}
        required
        className="form-input"
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
      />

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="btn btn--full" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Processing…' : isSignUp ? 'Sign up' : 'Sign in'}
      </button>
    </form>
  );
};

export default AuthForm;
