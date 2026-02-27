import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Save, Trash2, Highlighter, Play, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { createTranscript, createKeywords } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Demo lecture data with keywords
const DEMO_LECTURE = [
  { word: "Today", isKeyword: false },
  { word: "we'll", isKeyword: false },
  { word: "discuss", isKeyword: false },
  { word: "machine", isKeyword: false },
  { word: "learning", isKeyword: false },
  { word: "and", isKeyword: false },
  { word: "neural", isKeyword: false },
  { word: "networks.", isKeyword: true, explanation: "A computational model inspired by biological neural networks, used in machine learning." },
  { word: "First,", isKeyword: false },
  { word: "let's", isKeyword: false },
  { word: "understand", isKeyword: false },
  { word: "what", isKeyword: false },
  { word: "an", isKeyword: false },
  { word: "algorithm", isKeyword: true, explanation: "A step-by-step procedure for solving a problem or accomplishing a task." },
  { word: "is.", isKeyword: false },
  { word: "An", isKeyword: false },
  { word: "algorithm", isKeyword: true, explanation: "A step-by-step procedure for solving a problem or accomplishing a task." },
  { word: "uses", isKeyword: false },
  { word: "iteration", isKeyword: true, explanation: "The process of repeating a set of operations until a specific condition is met." },
  { word: "and", isKeyword: false },
  { word: "recursion", isKeyword: true, explanation: "A programming technique where a function calls itself to solve smaller instances of the same problem." },
  { word: "to", isKeyword: false },
  { word: "solve", isKeyword: false },
  { word: "problems.", isKeyword: false },
  { word: "In", isKeyword: false },
  { word: "object-oriented", isKeyword: false },
  { word: "programming,", isKeyword: false },
  { word: "we", isKeyword: false },
  { word: "use", isKeyword: false },
  { word: "classes", isKeyword: true, explanation: "A blueprint for creating objects that defines properties and methods." },
  { word: "and", isKeyword: false },
  { word: "objects", isKeyword: true, explanation: "An instance of a class containing data and methods to manipulate that data." },
  { word: "with", isKeyword: false },
  { word: "inheritance", isKeyword: true, explanation: "A mechanism where a new class derives properties and methods from an existing class." },
  { word: "and", isKeyword: false },
  { word: "polymorphism.", isKeyword: true, explanation: "The ability of different objects to respond to the same method call in their own way." },
];

const Transcribe = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [rawTranscript, setRawTranscript] = useState('');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [selectedText, setSelectedText] = useState('');
  const [browserSupported, setBrowserSupported] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedLength, setLastAnalyzedLength] = useState(0);
  const [hoveredKeyword, setHoveredKeyword] = useState(null);

  const recognitionRef = useRef(null);
  const demoIntervalRef = useRef(null);
  const analysisTimerRef = useRef(null);
  const [isRealtimeStreaming, setIsRealtimeStreaming] = useState(false);

  const [subject, setSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [transcriptionStopped, setTranscriptionStopped] = useState(false);

  const ANALYSIS_API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '') + '/api/analyze';

  /* ── Speech recognition ── */
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setBrowserSupported(false); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += piece + ' ';
        else interimTranscript += piece;
      }
      setRawTranscript(prev => {
        const cleaned = prev.replace(/\s*\|.*\|$/, '');
        if (finalTranscript) return cleaned + finalTranscript;
        return cleaned + (interimTranscript ? ' |' + interimTranscript + '|' : '');
      });
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    return () => { recognition.stop(); };
  }, []);

  /* ── Demo mode ── */
  useEffect(() => {
    if (!demoMode) return;
    setIsRecording(true);
    setTranscriptionStopped(false);
    setRawTranscript('');
    setEditedTranscript('');
    setKeywords([]);
    let idx = 0;

    demoIntervalRef.current = setInterval(() => {
      if (idx >= DEMO_LECTURE.length) {
        setIsRecording(false);
        setDemoMode(false);
        setTranscriptionStopped(true);
        clearInterval(demoIntervalRef.current);
        return;
      }
      const w = DEMO_LECTURE[idx];
      setRawTranscript(prev => prev + w.word + ' ');
      if (w.isKeyword) {
        setKeywords(prev => {
          const clean = w.word.replace(/[.,!?;]$/, '');
          if (prev.find(k => k.text === clean)) return prev;
          return [...prev, { text: clean, timestamp: Date.now(), explanation: w.explanation, source: 'demo' }];
        });
      }
      idx++;
    }, 400);

    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
      setIsRecording(false);
      setDemoMode(false);
    };
  }, [demoMode]);

  /* ── Auto-analyze transcript ── */
  const analyzeTranscript = useCallback(async (text) => {
    if (!text || text.length < 20) return;
    setIsAnalyzing(true);
    const cleaned = text.replace(/\|/g, '').trim();
    try {
      const res = await fetch(ANALYSIS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: cleaned }),
      });
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
      const data = await res.json();
      if (data.keywords?.length) {
        setKeywords(prev => {
          const updated = [...prev];
          data.keywords.forEach(kw => {
            const existing = updated.findIndex(c => c.text.toLowerCase() === kw.word.toLowerCase());
            if (existing >= 0) {
              if (!updated[existing].explanation && kw.definition) {
                updated[existing] = { ...updated[existing], explanation: kw.definition, source: updated[existing].source || 'ai' };
              }
            } else {
              updated.push({ text: kw.word, explanation: kw.definition, timestamp: Date.now(), source: 'ai' });
            }
          });
          return updated;
        });
      }
      setLastAnalyzedLength(cleaned.length);
    } catch (e) {
      console.error('[KEYWORD] Error analyzing:', e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [ANALYSIS_API]);

  useEffect(() => {
    if (!isRecording && !demoMode) return;
    if (!rawTranscript || rawTranscript.length < 20) return;
    if (rawTranscript.length - lastAnalyzedLength < 30) return;
    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
    analysisTimerRef.current = setTimeout(() => analyzeTranscript(rawTranscript), 500);
    return () => { if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current); };
  }, [rawTranscript, lastAnalyzedLength, analyzeTranscript, isRecording, demoMode]);

  const startRecording = () => {
    if (recognitionRef.current) { recognitionRef.current.start(); setIsRecording(true); setTranscriptionStopped(false); }
  };
  const stopRecording = () => {
    if (demoMode) { setDemoMode(false); if (demoIntervalRef.current) clearInterval(demoIntervalRef.current); }
    else if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setTranscriptionStopped(true);
    setEditedTranscript(rawTranscript.replace(/\|/g, '').trim());
  };
  const startDemo = () => { if (!isRecording && !isRealtimeStreaming) setDemoMode(true); };

  const handleTextSelection = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel) setSelectedText(sel);
  };
  const handleTextareaDoubleClick = (e) => {
    const text = editedTranscript;
    const pos = e.target.selectionStart;
    let start = pos, end = pos;
    while (start > 0 && /\w/.test(text[start - 1])) start--;
    while (end < text.length && /\w/.test(text[end])) end++;
    const word = text.substring(start, end).trim();
    if (word) setSelectedText(word);
  };

  const fetchKeywordDefinition = useCallback(async (word) => {
    try {
      let res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`);
      if (!res.ok) {
        const titled = word.charAt(0).toUpperCase() + word.slice(1);
        res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titled)}`);
        if (!res.ok) return '';
      }
      const data = await res.json();
      const extract = data.extract || '';
      return extract.substring(0, 150) + (extract.length > 150 ? '…' : '');
    } catch { return ''; }
  }, []);

  const addKeyword = async () => {
    if (!selectedText || keywords.find(k => k.text === selectedText)) return;
    const clean = selectedText.trim();
    let explanation = '';
    if (clean.length > 2) explanation = await fetchKeywordDefinition(clean);
    setKeywords(prev => [...prev, { text: clean, timestamp: Date.now(), explanation: explanation || undefined, source: 'manual' }]);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };
  const removeKeyword = (kw) => setKeywords(prev => prev.filter(k => k.text !== kw));

  /* ── Highlight keywords in displayed text ── */
  const highlightSentence = (sentenceText) => {
    if (!keywords.length) return sentenceText;
    let parts = [{ text: sentenceText, isKeyword: false }];
    keywords.forEach(keyword => {
      const newParts = [];
      parts.forEach(part => {
        if (part.isKeyword) { newParts.push(part); return; }
        const regex = new RegExp(`\\b(${keyword.text})\\b`, 'gi');
        const matches = [...part.text.matchAll(regex)];
        if (!matches.length) { newParts.push(part); return; }
        let last = 0;
        matches.forEach(match => {
          if (match.index > last) newParts.push({ text: part.text.slice(last, match.index), isKeyword: false });
          newParts.push({ text: match[0], isKeyword: true, keyword });
          last = match.index + match[0].length;
        });
        if (last < part.text.length) newParts.push({ text: part.text.slice(last), isKeyword: false });
      });
      parts = newParts;
    });
    return parts;
  };

  /* ── Save transcript ── */
  const saveTranscript = async () => {
    setSaveError('');
    if (!subject.trim() || !editedTranscript.trim()) { setSaveError('Please enter a subject and provide a transcript'); return; }
    if (!token) { setSaveError('Not authenticated. Please log in again.'); setTimeout(() => navigate('/signin'), 2000); return; }
    try {
      setIsSaving(true);
      const transcriptData = await createTranscript(token, { subject: subject.trim(), rawTranscript: editedTranscript.trim() });

      if (keywords?.length) {
        try {
          const kwData = keywords.map(kw => ({
            keywordText: typeof kw === 'string' ? kw : kw.keywordText || kw.word || kw.text,
            definition: kw.definition || kw.explanation || '',
            source: kw.source || 'manual',
          }));
          await createKeywords(token, { sessionId: transcriptData.sessionId, keywords: kwData });
        } catch (kwErr) {
          console.error('[SAVE] keyword error:', kwErr);
          setSaveError(`Transcript saved but keywords failed: ${kwErr?.payload?.error || kwErr?.message}`);
        }
      }

      setRawTranscript(''); setEditedTranscript(''); setKeywords([]);
      setSelectedText(''); setLastAnalyzedLength(0); setHoveredKeyword(null);
      setSubject(''); setTranscriptionStopped(false);
      alert('Transcript saved! Summary is being generated…');
      navigate('/transcripts');
    } catch (err) {
      const msg = err?.payload?.error || err?.message || 'Failed to save transcript';
      if (err?.status === 401 || err?.status === 403 || msg.includes('token')) {
        setSaveError(`Authentication error: ${msg}. Please log in again.`);
        setTimeout(() => navigate('/signin'), 2000);
      } else setSaveError(msg);
    } finally { setIsSaving(false); }
  };

  const clearTranscript = () => {
    if (!confirm('Clear this transcript?')) return;
    setRawTranscript(''); setEditedTranscript(''); setKeywords([]); setSubject('');
    setLastAnalyzedLength(0); setHoveredKeyword(null); setIsAnalyzing(false); setTranscriptionStopped(false);
    if (analysisTimerRef.current) { clearTimeout(analysisTimerRef.current); analysisTimerRef.current = null; }
  };

  /* ── Render helpers ── */
  const renderHighlighted = (text) => {
    if (!text) return null;
    return text.split(/(?<=[.,!?])\s+/).filter(s => s.trim()).map((sentence, sIdx) => {
      const clean = sentence.replace(/\|/g, '').trim();
      const parts = highlightSentence(clean);
      return (
        <div key={sIdx} style={{ marginBottom: '0.35rem' }}>
          {Array.isArray(parts) ? parts.map((p, pIdx) =>
            p.isKeyword ? (
              <mark key={`${p.text}-${sIdx}-${pIdx}`} className="keyword-mark"
                data-source={p.keyword.source}
                onMouseEnter={() => setHoveredKeyword(p.keyword)}
                onMouseLeave={() => setHoveredKeyword(null)}>
                {p.text}
                {hoveredKeyword === p.keyword && p.keyword.explanation && (
                  <span className="keyword-tooltip">{p.keyword.explanation}</span>
                )}
              </mark>
            ) : <span key={`${sIdx}-${pIdx}`}>{p.text}</span>
          ) : <span>{clean}</span>}
        </div>
      );
    });
  };

  if (!browserSupported) {
    return (
      <div className="page-state">
        <Alert variant="destructive">
          <AlertDescription>Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="page" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>AI-Assisted Live Transcription</h1>
        <p className="card__subtitle">Capture lectures, highlight keywords, and auto-generate summaries</p>
      </div>

      {saveError && (
        <Alert variant="destructive" style={{ marginBottom: '1rem' }}>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Subject */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div>
            <Label className="form-label">Subject / Course Name *</Label>
            <Input placeholder="e.g., Machine Learning 101" value={subject}
              onChange={(e) => setSubject(e.target.value)} disabled={isRecording || isRealtimeStreaming}
              className="form-input" />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="transcribe-grid">
        {/* Left – Transcription area */}
        <div className="card">
          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Controls */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {!isRecording && !isRealtimeStreaming ? (
                <>
                  <Button onClick={startRecording} className="btn">
                    <Mic size={16} /> Start Recording
                  </Button>
                  <Button onClick={startDemo} className="btn btn--ghost">
                    <Play size={16} /> Demo
                  </Button>
                </>
              ) : (
                <Button onClick={stopRecording} className="btn btn--danger">
                  <Square size={16} /> Stop Recording
                </Button>
              )}
              <Button onClick={() => analyzeTranscript(rawTranscript)}
                disabled={isAnalyzing || rawTranscript.length < 50}
                className="btn btn--ghost" title="Trigger AI keyword analysis">
                <RefreshCw size={16} /> {isAnalyzing ? 'Analyzing…' : 'Analyze'}
              </Button>
            </div>

            {(isRecording || isRealtimeStreaming) && (
              <div className="recording-indicator">
                <span className="recording-dot" />
                Recording in progress{isAnalyzing ? ' (AI analyzing…)' : ''}
              </div>
            )}

            {/* Transcript display / edit */}
            {!transcriptionStopped ? (
              <div className="transcript-display" onMouseUp={handleTextSelection}>
                {rawTranscript ? renderHighlighted(rawTranscript) : (
                  <span style={{ color: 'var(--text-muted)' }}>
                    Your transcription will appear here.
                    <br /><br />
                    <small>The assistant will extract keywords and definitions automatically as you speak.</small>
                  </span>
                )}
              </div>
            ) : (
              <div>
                <Label className="form-label">Edit Transcript</Label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  💡 Double-click a word to add it as a keyword
                </p>
                <textarea value={editedTranscript} onChange={(e) => setEditedTranscript(e.target.value)}
                  onDoubleClick={handleTextareaDoubleClick}
                  className="neon-textarea" style={{ minHeight: '300px', lineHeight: 1.8 }}
                  placeholder="Your transcript will appear here. You can edit it before saving." />

                {editedTranscript && keywords.length > 0 && (
                  <div className="transcript-preview" style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Keywords highlighted:</div>
                    {renderHighlighted(editedTranscript)}
                  </div>
                )}
              </div>
            )}

            {selectedText && (
              <div className="selection-banner">
                <span style={{ fontSize: '0.875rem', flex: 1 }}>
                  Selected: <strong style={{ color: 'var(--accent-cyan)' }}>{selectedText}</strong>
                </span>
                <Button onClick={addKeyword} size="sm" className="btn btn--sm">
                  <Highlighter size={14} /> Add Keyword
                </Button>
              </div>
            )}

            {/* Save / Clear */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button onClick={saveTranscript} disabled={!editedTranscript || isSaving || !subject} className="btn">
                <Save size={16} /> {isSaving ? 'Saving…' : 'Save Transcript'}
              </Button>
              <Button onClick={clearTranscript} disabled={!rawTranscript && !editedTranscript} className="btn btn--ghost">
                <Trash2 size={16} /> Clear
              </Button>
            </div>

            {isSummarizing && (
              <div style={{
                padding: '1rem', background: 'rgba(0,255,231,0.06)', border: '1px solid rgba(0,255,231,0.15)',
                borderRadius: '0.75rem', fontSize: '0.875rem', color: 'var(--accent-cyan)' }}>
                ⏳ Summary is generated automatically after save.
              </div>
            )}
          </div>
        </div>

        {/* Right – Keywords sidebar */}
        <div className="card keyword-sidebar">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Keywords ({keywords.length})
            </h3>
            {isAnalyzing && <span className="tag tag--cyan" style={{ fontSize: '0.7rem' }}>AI analyzing…</span>}
          </div>

          {keywords.length === 0 ? (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              AI-extracted and manual keywords will appear here with definitions.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '600px', overflowY: 'auto' }}>
              {keywords.map((kw, i) => (
                <div key={`${kw.text}-${i}`} className="keyword-chip" data-source={kw.source}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                      {kw.text}
                      {kw.source && <span className={`tag tag--${kw.source === 'ai' ? 'cyan' : 'yellow'}`}>{kw.source}</span>}
                    </div>
                    {kw.explanation && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{kw.explanation}</div>
                    )}
                  </div>
                  <button onClick={() => removeKeyword(kw.text)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', flexShrink: 0 }}
                    title="Remove keyword">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transcribe;
