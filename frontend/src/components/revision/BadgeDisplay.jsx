export default function BadgeDisplay({ badges }) {
  if (!badges || badges.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No badges unlocked yet. Keep going!
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
