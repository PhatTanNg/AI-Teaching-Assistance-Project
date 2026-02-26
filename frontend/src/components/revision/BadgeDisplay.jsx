export default function BadgeDisplay({ badges }) {
  if (!badges || badges.length === 0) {
    return <p>No badges unlocked yet.</p>;
  }

  return (
    <ul>
      {badges.map((badge) => (
        <li key={badge}>🏅 {badge}</li>
      ))}
    </ul>
  );
}
