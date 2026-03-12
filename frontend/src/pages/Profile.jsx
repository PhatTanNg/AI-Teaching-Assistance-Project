import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { apiClient } from '../api/client.js';

const Profile = () => {
  const { token, user, refreshProfile } = useAuth();
  const { t, lang, setLang } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [isSavingPw, setIsSavingPw] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? user.username ?? '');
      setDateOfBirth(user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await apiClient('/api/users/me', { method: 'PUT', token, data: { displayName, dateOfBirth: dateOfBirth || null } });
      await refreshProfile();
      setSaveSuccess(t('profile.saveSuccess'));
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch {
      setSaveError(t('profile.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    setPwError('');
    if (newPassword !== confirmPassword) {
      setPwError(t('profile.passwordMismatch'));
      return;
    }
    setIsSavingPw(true);
    try {
      await apiClient('/api/users/me/password', { method: 'PUT', token, data: { oldPassword, newPassword } });
      setPwSuccess(t('profile.saveSuccess'));
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err) {
      setPwError(err.message || t('profile.saveFailed'));
    } finally {
      setIsSavingPw(false);
    }
  };

  if (!user) {
    return (
      <div className="page-state">
        <div className="spinner" aria-hidden="true" />
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';

  return (
    <div className="page">
      {/* ── Account Info ── */}
      <section className="card card--wide" style={{ marginBottom: '1.5rem' }}>
        <div className="card__header">
          <div>
            <h2 className="card__title">{t('profile.title')}</h2>
          </div>
          {!isEditing && (
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setIsEditing(true)}>
              {t('profile.editBtn')}
            </button>
          )}
        </div>

        {saveSuccess && (
          <p style={{ color: 'var(--accent-green)', marginBottom: '1rem', fontSize: '0.875rem' }}>{saveSuccess}</p>
        )}
        {saveError && (
          <p style={{ color: 'var(--accent-red)', marginBottom: '1rem', fontSize: '0.875rem' }}>{saveError}</p>
        )}

        <dl className="profile-grid">
          <div>
            <dt>{t('profile.displayName')}</dt>
            <dd>
              {isEditing ? (
                <input
                  className="form-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{ maxWidth: '280px' }}
                />
              ) : (
                user.displayName
              )}
            </dd>
          </div>
          <div>
            <dt>{t('profile.username')}</dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt>{t('profile.email')}</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>{t('profile.memberSince')}</dt>
            <dd>{createdAt}</dd>
          </div>
          <div>
            <dt>{t('profile.dateOfBirth')}</dt>
            <dd>
              {isEditing ? (
                <input
                  type="date"
                  className="form-input"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  style={{ maxWidth: '200px' }}
                />
              ) : (
                user.dateOfBirth
                  ? new Date(user.dateOfBirth).toLocaleDateString()
                  : '—'
              )}
            </dd>
          </div>
        </dl>

        {isEditing && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn--sm" type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? t('common.loading') : t('profile.saveBtn')}
            </button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => {
              setIsEditing(false);
              setDisplayName(user.displayName ?? user.username ?? '');
              setDateOfBirth(user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : '');
              setSaveError('');
            }}>
              {t('profile.cancelBtn')}
            </button>
          </div>
        )}
      </section>

      {/* ── UI Language ── */}
      <section className="card card--wide" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card__title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
          {t('profile.uiLanguage')}
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['vi', 'en'].map((l) => (
            <button
              key={l}
              type="button"
              className={`btn btn--sm${lang === l ? '' : ' btn--ghost'}`}
              onClick={() => setLang(l)}
            >
              {l === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      </section>

      {/* ── Change Password ── */}
      <section className="card card--wide">
        <div className="card__header">
          <h3 className="card__title" style={{ fontSize: '1rem' }}>{t('profile.changePassword')}</h3>
          {!showPasswordForm && (
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setShowPasswordForm(true)}>
              {t('profile.editBtn')}
            </button>
          )}
        </div>

        {pwSuccess && (
          <p style={{ color: 'var(--accent-green)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{pwSuccess}</p>
        )}

        {showPasswordForm && (
          <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '320px' }}>
            {pwError && (
              <p style={{ color: 'var(--accent-red)', fontSize: '0.875rem' }}>{pwError}</p>
            )}
            <div>
              <label className="form-label">{t('profile.oldPassword')}</label>
              <input type="password" className="form-input" value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)} />
            </div>
            <div>
              <label className="form-label">{t('profile.newPassword')}</label>
              <input type="password" className="form-input" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label className="form-label">{t('profile.confirmPassword')}</label>
              <input type="password" className="form-input" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn--sm" type="button" onClick={handlePasswordSave} disabled={isSavingPw}>
                {isSavingPw ? t('common.loading') : t('profile.saveBtn')}
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => {
                setShowPasswordForm(false);
                setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setPwError('');
              }}>
                {t('profile.cancelBtn')}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;
