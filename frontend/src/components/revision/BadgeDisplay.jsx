import { useLanguage } from '../../context/LanguageContext.jsx';

export default function BadgeDisplay({ badges }) {
  const { t } = useLanguage();

  if (!badges || badges.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        {t('revision.noBadges')}
      </p>
    );
  }

  return (
    <div className="badge-grid">
      {badges.map(badge => (
        <div key={badge} className="badge-item">
          <span className="badge-item__icon">🏅</span>
          <span className="badge-item__name">{badge}</span>
        </div>
      ))}
    </div>
  );
}
