import { useMemo, useState } from 'react';

const OPTION_KEYS = ['A', 'B', 'C', 'D'];

export default function McqQuiz({ questions, onSubmitBatch, isLoading }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);

  const currentQuestion = useMemo(
    () => (questions && questions.length > 0 ? questions[index] : null),
    [questions, index],
  );

  if (!currentQuestion) {
    return (
      <section className="card">
        <h2>MCQ Quiz</h2>
        <p>No MCQs generated yet.</p>
      </section>
    );
  }

  const submitAnswer = async () => {
    if (!selected) return;

    const payload = await onSubmitBatch([
      {
        question_id: currentQuestion.id,
        selected,
        time_taken_ms: 0,
      },
    ]);

    const result = payload?.submitted?.[0];
    setFeedback(result || null);
    if (result?.is_correct) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const nextQuestion = () => {
    setSelected('');
    setFeedback(null);
    if (index < questions.length - 1) {
      setIndex((prev) => prev + 1);
    }
  };

  return (
    <section className="card">
      <h2>MCQ Quiz</h2>
      <p>
        Score: {correctCount}/{index + (feedback ? 1 : 0)} correct
      </p>
      <h3>{currentQuestion.question}</h3>

      <fieldset disabled={Boolean(feedback) || isLoading}>
        {OPTION_KEYS.map((key) => {
          const optionText = currentQuestion.options?.[key];
          const isCorrect = feedback?.correct === key;
          const isSelectedWrong = feedback && feedback.selected === key && feedback.correct !== key;

          return (
            <label key={key} className={isCorrect ? 'revision-option--correct' : isSelectedWrong ? 'revision-option--wrong' : ''}>
              <input
                type="radio"
                name={`question-${currentQuestion.id}`}
                value={key}
                checked={selected === key}
                onChange={(event) => setSelected(event.target.value)}
              />
              {key}: {optionText}
            </label>
          );
        })}
      </fieldset>

      {!feedback ? (
        <button type="button" className="btn" onClick={submitAnswer} disabled={!selected || isLoading}>
          Submit
        </button>
      ) : (
        <>
          <p>{feedback.is_correct ? 'Correct' : 'Incorrect'}</p>
          <p>{feedback.explanation}</p>
          <button type="button" className="btn" onClick={nextQuestion} disabled={isLoading || index >= questions.length - 1}>
            Next Question
          </button>
        </>
      )}
    </section>
  );
}
