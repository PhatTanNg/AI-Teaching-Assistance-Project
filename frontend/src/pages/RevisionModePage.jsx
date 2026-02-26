import { useEffect, useMemo, useState } from 'react';
import TranscriptSelector from '../components/revision/TranscriptSelector.jsx';
import FlashcardReview from '../components/revision/FlashcardReview.jsx';
import McqQuiz from '../components/revision/McqQuiz.jsx';
import ProgressDashboard from '../components/revision/ProgressDashboard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001';
const tokenKey = 'aita_access_token';

const getToken = () => {
  try {
    return localStorage.getItem(tokenKey) || '';
  } catch {
    return '';
  }
};

const apiRequest = async (path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || 'Revision request failed');
  }
  return payload;
};

export default function RevisionModePage() {
  const { user } = useAuth();
  const [transcripts, setTranscripts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(10);
  const [flashcards, setFlashcards] = useState([]);
  const [mcqs, setMcqs] = useState([]);
  const [progress, setProgress] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const studentId = useMemo(() => user?._id || user?.id || '', [user]);

  const loadTranscripts = async () => {
    const payload = await apiRequest('/api/content/transcripts');
    setTranscripts(Array.isArray(payload) ? payload : []);
  };

  const loadProgress = async () => {
    if (!studentId) return;
    const [progressPayload, weakPayload] = await Promise.all([
      apiRequest(`/revision/progress/${studentId}`),
      apiRequest(`/revision/weak-topics/${studentId}`),
    ]);

    setProgress(progressPayload);
    setWeakTopics(weakPayload?.weak_topics || []);
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadTranscripts(), loadProgress()])
      .catch((requestError) => setError(requestError.message || 'Failed to load revision data'))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleTranscript = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const generateFlashcards = async () => {
    try {
      setError('');
      setIsLoading(true);
      if (!studentId) {
        setError('Session expired. Please sign in again.');
        return;
      }
      const payload = await apiRequest('/revision/flashcards/generate', {
        method: 'POST',
        body: {
          student_id: studentId,
          transcript_ids: selectedIds,
          count,
          difficulty,
        },
      });
      setFlashcards(payload.flashcards || []);
      await loadProgress();
    } catch (requestError) {
      setError(requestError.message || 'Failed to generate flashcards');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMcqs = async () => {
    try {
      setError('');
      setIsLoading(true);
      if (!studentId) {
        setError('Session expired. Please sign in again.');
        return;
      }
      const payload = await apiRequest('/revision/mcq/generate', {
        method: 'POST',
        body: {
          student_id: studentId,
          transcript_ids: selectedIds,
          count,
          difficulty,
        },
      });
      setMcqs(payload.questions || []);
      await loadProgress();
    } catch (requestError) {
      setError(requestError.message || 'Failed to generate MCQs');
    } finally {
      setIsLoading(false);
    }
  };

  const rateFlashcard = async (flashcardId, rating) => {
    if (!studentId) {
      throw new Error('Session expired. Please sign in again.');
    }
    const payload = await apiRequest('/revision/flashcard/rate', {
      method: 'POST',
      body: {
        flashcard_id: flashcardId,
        student_id: studentId,
        rating,
      },
    });
    await loadProgress();
    return payload;
  };

  const submitMcqAnswers = async (answers) => {
    if (!studentId) {
      throw new Error('Session expired. Please sign in again.');
    }
    const payload = await apiRequest('/revision/mcq/submit', {
      method: 'POST',
      body: {
        student_id: studentId,
        answers,
      },
    });
    await loadProgress();
    return payload;
  };

  return (
    <div>
      <h1>Revision Mode</h1>
      {error ? <p role="alert">{error}</p> : null}

      <TranscriptSelector
        transcripts={transcripts}
        selectedIds={selectedIds}
        onToggleTranscript={toggleTranscript}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        count={count}
        onCountChange={setCount}
        onGenerateFlashcards={generateFlashcards}
        onGenerateMcqs={generateMcqs}
        isLoading={isLoading}
      />

      <FlashcardReview cards={flashcards} onRate={rateFlashcard} isLoading={isLoading} />
      <McqQuiz questions={mcqs} onSubmitBatch={submitMcqAnswers} isLoading={isLoading} />
      <ProgressDashboard
        progress={progress}
        weakTopics={weakTopics}
        onReviewWeakTopics={() => {
          setSelectedIds([]);
        }}
      />
    </div>
  );
}
