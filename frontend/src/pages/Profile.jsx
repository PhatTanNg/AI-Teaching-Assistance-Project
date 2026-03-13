import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { apiClient } from '../api/client.js';

const PRESET_AVATARS = ['🐒', '🐼', '🦊', '🐨', '🦁', '🐸', '🦋', '🐧', '🦉', '🐺', '🦝', '🐻', '🐯', '🦄', '🐙', '🦈'];

const Profile = () => {
  const { token, user, refreshProfile, logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const isDark = theme !== 'light';

  const [showBg, setShowBg] = useState(
    () => localStorage.getItem('aita-floating-bg') !== '0'
  );

  const toggleBg = (val) => {
    localStorage.setItem('aita-floating-bg', val ? '1' : '0');
    window.dispatchEvent(new Event('aita-prefs-change'));
    setShowBg(val);
  };

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

  // Avatar picker
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Account deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const handleAvatarSelect = async (avatarValue) => {
    setIsSavingAvatar(true);
    try {
      await apiClient('/api/users/me', { method: 'PUT', token, data: { displayName: user.displayName ?? user.username, avatarUrl: avatarValue } });
      await refreshProfile();
      setShowAvatarPicker(false);
    } catch {
      // silently fail — avatar is non-critical
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      // center-crop to square
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 96, 96);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(objectUrl);
      handleAvatarSelect(dataUrl);
    };
    img.src = objectUrl;
    // reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.username) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await apiClient('/api/users/me', { method: 'DELETE', token });
      logout();
    } catch {
      setDeleteError(t('profile.deleteError'));
      setIsDeleting(false);
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
  const isImageUrl = user.avatarUrl && (user.avatarUrl.startsWith('data:') || user.avatarUrl.startsWith('http'));
  const isEmojiAvatar = user.avatarUrl && !isImageUrl;
  const avatarInitial = (user.displayName?.[0] || user.username?.[0] || '?').toUpperCase();

  return (
    <div className="page">
      {/* ── Account Info ── */}
      <section className="card card--wide" style={{ marginBottom: '1.5rem' }}>
        <div className="card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Avatar */}
            <button
              type="button"
              onClick={() => setShowAvatarPicker(true)}
              title={t('profile.changeAvatar')}
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--bg-elevated)',
                border: '2px solid var(--card-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isEmojiAvatar ? '1.6rem' : '1.3rem',
                fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                color: 'var(--accent-primary)', transition: 'border-color 0.2s',
                overflow: 'hidden', padding: 0, outline: 'none',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
            >
              {isImageUrl ? (
                <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                isEmojiAvatar ? user.avatarUrl : avatarInitial
              )}
            </button>
            <div>
              <h2 className="card__title">{t('profile.title')}</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{t('profile.changeAvatar')}</p>
            </div>
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

      {/* ── Preferences ── */}
      <section className="card card--wide" style={{ marginBottom: '1.5rem' }}>
        <h3 className="card__title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
          {t('profile.preferences')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Theme */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('profile.theme')}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn btn--sm${isDark ? '' : ' btn--ghost'}`}
                onClick={() => setTheme('dark')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Moon size={14} /> {t('profile.themeDark')}
              </button>
              <button
                type="button"
                className={`btn btn--sm${!isDark ? '' : ' btn--ghost'}`}
                onClick={() => setTheme('light')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Sun size={14} /> {t('profile.themeLight')}
              </button>
            </div>
          </div>
          {/* Language */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('profile.uiLanguage')}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['en', 'vi'].map((l) => (
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
          </div>
          {/* Background animation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('profile.showBackground')}</span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{t('profile.showBackgroundDesc')}</p>
            </div>
            <button
              type="button"
              className={`btn btn--sm${showBg ? '' : ' btn--ghost'}`}
              onClick={() => toggleBg(!showBg)}
            >
              {showBg ? t('profile.bgOn') : t('profile.bgOff')}
            </button>
          </div>
        </div>
      </section>

      {/* ── Change Password ── */}
      <section className="card card--wide" style={{ marginBottom: '1.5rem' }}>
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
                onChange={(e) => setOldPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <div>
              <label className="form-label">{t('profile.newPassword')}</label>
              <input type="password" className="form-input" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <label className="form-label">{t('profile.confirmPassword')}</label>
              <input type="password" className="form-input" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
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

      {/* ── Session / Logout ── */}
      <section className="card card--wide" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 className="card__title" style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{t('profile.logoutSection')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{t('profile.logoutDesc')}</p>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}
          >
            <LogOut size={14} /> {t('profile.logoutBtn')}
          </button>
        </div>
      </section>

      {/* ── Danger Zone ── */}
      <section className="card card--wide" style={{ borderColor: 'rgba(239,68,68,0.35)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 className="card__title" style={{ fontSize: '1rem', color: 'var(--accent-red)', marginBottom: '0.25rem' }}>
              {t('profile.dangerZone')}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, maxWidth: '360px' }}>
              {t('profile.deleteAccountDesc')}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setShowDeleteModal(true)}
            style={{ background: 'transparent', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', flexShrink: 0 }}
          >
            <Trash2 size={14} style={{ marginRight: '0.4rem' }} />
            {t('profile.deleteAccount')}
          </button>
        </div>
      </section>

      {/* ── Avatar Picker Modal ── */}
      {showAvatarPicker && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem',
          }}
          onClick={() => setShowAvatarPicker(false)}
        >
          <div
            style={{
              background: 'var(--bg-elevated)', borderRadius: '1rem', padding: '1.5rem',
              border: '1px solid var(--card-border)', maxWidth: '340px', width: '100%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>{t('profile.avatarPickerTitle')}</h3>

            {/* Upload photo button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSavingAvatar}
              style={{
                width: '100%', padding: '0.6rem 1rem', marginBottom: '1rem',
                borderRadius: '0.5rem', border: '1px dashed var(--card-border)',
                background: 'transparent', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.875rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                outline: 'none',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              📷 {t('profile.uploadPhoto')}
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {PRESET_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleAvatarSelect(emoji)}
                  disabled={isSavingAvatar}
                  style={{
                    fontSize: '2rem', padding: '0.5rem', borderRadius: '0.5rem',
                    border: user.avatarUrl === emoji ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    background: user.avatarUrl === emoji ? 'var(--bg-secondary)' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.15s',
                    outline: 'none', aspectRatio: '1',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseOut={e => e.currentTarget.style.background = user.avatarUrl === emoji ? 'var(--bg-secondary)' : 'transparent'}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Account Modal ── */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '1rem',
          }}
          onClick={() => { if (!isDeleting) { setShowDeleteModal(false); setDeleteConfirm(''); setDeleteError(''); } }}
        >
          <div
            style={{
              background: 'var(--bg-elevated)', borderRadius: '1rem', padding: '1.5rem',
              border: '1px solid rgba(239,68,68,0.4)', maxWidth: '400px', width: '100%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-red)', marginBottom: '0.75rem' }}>
              {t('profile.deleteAccount')}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {t('profile.deleteAccountDesc')}
            </p>
            <label className="form-label">{t('profile.deleteConfirmLabel')}: <strong>{user.username}</strong></label>
            <input
              className="form-input"
              style={{ marginTop: '0.5rem', borderColor: 'rgba(239,68,68,0.4)' }}
              placeholder={t('profile.deleteConfirmPlaceholder')}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              autoComplete="off"
            />
            {deleteError && (
              <p style={{ color: 'var(--accent-red)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn--sm"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== user.username || isDeleting}
                style={{
                  background: deleteConfirm === user.username ? 'var(--accent-red)' : 'var(--bg-secondary)',
                  border: 'none', color: deleteConfirm === user.username ? '#fff' : 'var(--text-muted)',
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? t('profile.deleting') : t('profile.deleteBtn')}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); setDeleteError(''); }}
                disabled={isDeleting}
              >
                {t('profile.cancelBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
