import { useEffect, useMemo, useRef, useState } from 'react';
import TranscriptSelector from '../components/revision/TranscriptSelector.jsx';
import FlashcardReview from '../components/revision/FlashcardReview.jsx';
import McqQuiz from '../components/revision/McqQuiz.jsx';
import ProgressDashboard from '../components/revision/ProgressDashboard.jsx';
import GenerationLoader from '../components/revision/GenerationLoader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001';
const tokenKey = 'aita_access_token';

const getToken = () => {
  try { return localStorage.getItem(tokenKey) || ''; } catch { return ''; }
};

const apiRequest = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.message || 'Revision request failed');
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
  const [loaderType, setLoaderType] = useState(null); // 'mcq' | 'flashcard' | null
  const loaderRef = useRef(null);

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
      .catch(e => setError(e.message || 'Failed to load revision data'))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleTranscript = (id) => {
    setSelectedIds(curr => curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);
  };

  const generateFlashcards = async () => {
    try {
      setError(''); setIsLoading(true); setLoaderType('flashcard');
      if (!studentId) { setError('Session expired. Please sign in again.'); setLoaderType(null); return; }
      const payload = await apiRequest('/revision/flashcards/generate', {
        method: 'POST', body: { student_id: studentId, transcript_ids: selectedIds, count, difficulty },
      });
      setFlashcards(payload.flashcards || []);
      loaderRef.current?.complete();
      await loadProgress();
    } catch (e) { setError(e.message || 'Failed to generate flashcards'); setLoaderType(null); }
    finally { setIsLoading(false); }
  };

  const generateMcqs = async () => {
    try {
      setError(''); setIsLoading(true);
      if (!studentId) { setError('Session expired. Please sign in again.'); setLoaderType(null); return; }
      const payload = await apiRequest('/revision/mcq/generate', {
        method: 'POST', body: { student_id: studentId, transcript_ids: selectedIds, count, difficulty },
      });
      // Debug: inspect the raw API response shape
      console.log('[REVISION] MCQ RAW RESPONSE:', JSON.stringify(payload, null, 2));
      console.log('[REVISION] questions count:', payload.questions?.length);
      if (payload.questions?.[0]) {
        console.log('[REVISION] first question sample:', JSON.stringify(payload.questions[0], null, 2));
      }
      setMcqs(payload.questions || []);
      loaderRef.current?.complete();
      await loadProgress();
    } catch (e) { setError(e.message || 'Failed to generate MCQs'); setLoaderType(null); }
    finally { setIsLoading(false); }
  };

  const rateFlashcard = async (flashcardId, rating) => {
    if (!studentId) throw new Error('Session expired.');
    const payload = await apiRequest('/revision/flashcard/rate', {
      method: 'POST', body: { flashcard_id: flashcardId, student_id: studentId, rating },
    });
    await loadProgress();
    return payload;
  };

  const submitMcqAnswers = async (answers) => {
    if (!studentId) throw new Error('Session expired.');
    const payload = await apiRequest('/revision/mcq/submit', {
      method: 'POST', body: { student_id: studentId, answers },
    });
    await loadProgress();
    return payload;
  };

  return (
    <div className="page" style={{ width: '100%', maxWidth: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Revision Mode</h1>
        <p className="card__subtitle">Generate flashcards & MCQs from your transcripts, track your progress</p>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: '0.75rem', color: 'var(--accent-rose)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <div className="revision-layout">
        {/* Left column — selector + review */}
        <div className="revision-main">
          <TranscriptSelector
            transcripts={transcripts} selectedIds={selectedIds}
            onToggleTranscript={toggleTranscript} difficulty={difficulty}
            onDifficultyChange={setDifficulty} count={count}
            onCountChange={setCount} onGenerateFlashcards={generateFlashcards}
            onGenerateMcqs={generateMcqs} isLoading={isLoading}
          />
          <FlashcardReview cards={flashcards} onRate={rateFlashcard} isLoading={isLoading} />
          <McqQuiz questions={mcqs} onSubmitBatch={submitMcqAnswers} isLoading={isLoading} />
        </div>

        {/* Right column — progress */}
        <div className="revision-aside">
          <ProgressDashboard progress={progress} weakTopics={weakTopics}
            onReviewWeakTopics={() => setSelectedIds([])} />
        </div>
      </div>

      <GenerationLoader
        ref={loaderRef}
        isOpen={!!loaderType}
        type={loaderType || 'mcq'}
        onComplete={() => setLoaderType(null)}
      />
    </div>
  );
}
