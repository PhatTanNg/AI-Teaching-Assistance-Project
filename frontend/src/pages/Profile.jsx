import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const Profile = () => {
  const { token, user, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError('');
    try {
      await refreshProfile();
      setSessionInfo({ lastRefreshed: new Date().toISOString() });
    } catch (err) {
      setError('Unable to refresh profile');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setSessionInfo({ lastRefreshed: new Date().toISOString() });
  }, []);

  if (!user) {
    return (
      <div className="page-state">
        <div className="spinner" aria-hidden="true" />
        <p>Loading your profile…</p>
      </div>
    );
  }

  const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Not available';

  return (
    <div className="page">
      <section className="card card--wide">
        <div className="card__header">
          <div>
            <h2 className="card__title">Account overview</h2>
            <p className="card__subtitle">Manage the details associated with your assistant.</p>
          </div>
          <button className="btn btn--ghost" disabled={isRefreshing} onClick={handleRefresh} type="button">
            {isRefreshing ? 'Refreshing…' : 'Refresh info'}
          </button>
        </div>
        <dl className="profile-grid">
          <div>
            <dt>Display name</dt>
            <dd>{user.displayName}</dd>
          </div>
          <div>
            <dt>Username</dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Account created</dt>
            <dd>{createdAt}</dd>
          </div>
          <div>
            <dt>Access token</dt>
            <dd className="profile-token">{token}</dd>
          </div>
        </dl>
        {sessionInfo ? (
          <p className="card__meta">Last refreshed: {new Date(sessionInfo.lastRefreshed).toLocaleTimeString()}</p>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
};

export default Profile;
