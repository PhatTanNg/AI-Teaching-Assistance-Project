import BadgeDisplay from './BadgeDisplay.jsx';

export default function ProgressDashboard({ progress, weakTopics, onReviewWeakTopics }) {
  const accuracy = progress?.accuracy || 0;

  return (
    <section className="card">
      <h2>Your Progress</h2>
      <p>Transcripts Studied: {progress?.transcripts_studied || 0}</p>
      <p>Flashcards Created: {progress?.total_flashcards || 0}</p>
      <p>
        MCQs Completed: {progress?.total_mcqs_done || 0} Accuracy: {accuracy}%
      </p>
      <p>Study Streak: {progress?.current_streak_days || 0} days</p>
      <p>XP Points: {progress?.xp_points || 0}</p>

      <h3>Weak Topics</h3>
      {weakTopics?.length ? (
        <ul>
          {weakTopics.map((topic) => (
            <li key={topic.topic}>
              {topic.topic} ({topic.accuracy}% accuracy)
            </li>
          ))}
        </ul>
      ) : (
        <p>No weak topics yet.</p>
      )}

      <button type="button" className="btn" onClick={onReviewWeakTopics}>
        Review Weak Topics Now
      </button>

      <h3>Badges</h3>
      <BadgeDisplay badges={progress?.badges || []} />
    </section>
  );
}
