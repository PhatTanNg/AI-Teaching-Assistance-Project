import BadgeDisplay from './BadgeDisplay.jsx';

export default function ProgressDashboard({ progress, weakTopics, onReviewWeakTopics }) {
  const accuracy = progress?.accuracy || 0;
  const xp = progress?.xp_points || 0;
  const xpMax = Math.max(xp, 1000); // simple bar scale
  const streak = progress?.current_streak_days || 0;

  return (
    <section className="card revision-card progress-dashboard">
      <h2 className="revision-card__title">Your Progress</h2>

      {/* Stat cards */}
      <div className="progress-stats">
        <div className="progress-stat">
          <span className="progress-stat__value">{progress?.transcripts_studied || 0}</span>
          <span className="progress-stat__label">Studied</span>
        </div>
        <div className="progress-stat">
          <span className="progress-stat__value">{progress?.total_flashcards || 0}</span>
          <span className="progress-stat__label">Flashcards</span>
        </div>
        <div className="progress-stat">
          <span className="progress-stat__value">{progress?.total_mcqs_done || 0}</span>
          <span className="progress-stat__label">MCQs Done</span>
        </div>
        <div className="progress-stat">
          <span className="progress-stat__value">{accuracy}%</span>
          <span className="progress-stat__label">Accuracy</span>
        </div>
      </div>

      {/* XP Bar */}
      <div className="xp-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>XP Points</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{xp}</span>
        </div>
        <div className="xp-bar">
          <div className="xp-bar__fill" style={{ width: `${Math.min((xp / xpMax) * 100, 100)}%` }} />
        </div>
      </div>

      {/* Streak */}
      <div className="streak-section">
        <span className="streak-flame">🔥</span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{streak} day streak</span>
      </div>

      {/* Weak Topics */}
      <div className="weak-topics">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Weak Topics
        </h3>
        {weakTopics?.length ? (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {weakTopics.map(topic => (
              <div key={topic.topic} className="weak-topic-row">
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>{topic.topic}</span>
                <div className="weak-topic-bar">
                  <div className="weak-topic-bar__fill" style={{ width: `${topic.accuracy}%` }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: '3rem', textAlign: 'right' }}>
                  {topic.accuracy}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No weak topics yet — keep studying!</p>
        )}
        <button type="button" className="btn btn--ghost" style={{ marginTop: '0.75rem' }}
          onClick={onReviewWeakTopics}>
          Review Weak Topics
        </button>
      </div>

      {/* Badges */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Badges</h3>
        <BadgeDisplay badges={progress?.badges || []} />
      </div>
    </section>
  );
}
