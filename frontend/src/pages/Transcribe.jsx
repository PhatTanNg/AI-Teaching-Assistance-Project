import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Save, Trash2, Highlighter, Play, RefreshCw, Upload, Sparkles, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';
import { createTranscript, createKeywords, transcribeFile, correctTranscript } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

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

const LANG_LOCALES = { vi: 'vi-VN', en: 'en-IE' };
const LANG_LABELS  = { vi: '🇻🇳 Tiếng Việt', en: '🇬🇧 English' };

const Transcribe = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLanguage();

  // Input mode + language
  const [inputMode, setInputMode]       = useState('live'); // 'live' | 'upload'
  const [transcribeLang, setTranscribeLang] = useState('vi');
  const [autoCorrect, setAutoCorrect]   = useState(true);

  // Upload mode
  const [uploadFile, setUploadFile]             = useState(null);
  const [isTranscribingFile, setIsTranscribingFile] = useState(false);

  // AI correction diff (post-transcription)
  const [correctionDiff, setCorrectionDiff]     = useState(null); // { original, corrected }
  const [isCorrectingFull, setIsCorrectingFull] = useState(false);

  // Real-time 3-layer transcript state
  const [correctedText, setCorrectedText]   = useState('');
  const [pendingChunks, setPendingChunks]   = useState([]); // [{id, raw}]
  const [interimText, setInterimText]       = useState('');

  // Refs for use inside async callbacks (avoids stale closures)
  const tokenRef          = useRef(token);
  const autoCorrectRef    = useRef(autoCorrect);
  const correctedTextRef  = useRef('');
  const pendingChunksRef  = useRef([]);
  const chunkIdRef        = useRef(0);

  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { autoCorrectRef.current = autoCorrect; }, [autoCorrect]);

  const [isRecording, setIsRecording]                 = useState(false);
  const [rawTranscript, setRawTranscript]             = useState('');
  const [editedTranscript, setEditedTranscript]       = useState('');
  const [keywords, setKeywords]                       = useState([]);
  const [selectedText, setSelectedText]               = useState('');
  const [browserSupported, setBrowserSupported]       = useState(true);
  const [demoMode, setDemoMode]                       = useState(false);
  const [isAnalyzing, setIsAnalyzing]                 = useState(false);
  const [lastAnalyzedLength, setLastAnalyzedLength]   = useState(0);
  const [hoveredKeyword, setHoveredKeyword]           = useState(null);

  const recognitionRef    = useRef(null);
  const demoIntervalRef   = useRef(null);
  const analysisTimerRef  = useRef(null);
  const isRecordingRef    = useRef(false);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  const [isRealtimeStreaming] = useState(false);

  const [subject, setSubject]                       = useState('');
  const [isSaving, setIsSaving]                     = useState(false);
  const [saveError, setSaveError]                   = useState('');
  const [isSummarizing]                             = useState(false);
  const [transcriptionStopped, setTranscriptionStopped] = useState(false);

  const ANALYSIS_API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '') + '/api/analyze';

  /* ── Speech recognition setup (re-runs only when language changes) ── */
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setBrowserSupported(false); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous    = true;
    recognition.interimResults = true;
    recognition.lang          = LANG_LOCALES[transcribeLang] || 'vi-VN';

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interim    = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += piece + ' ';
        else interim += piece;
      }

      setInterimText(interim);

      if (finalChunk.trim()) {
        const id  = ++chunkIdRef.current;
        const raw = finalChunk;

        // Show raw in pending immediately
        pendingChunksRef.current = [...pendingChunksRef.current, { id, raw }];
        setPendingChunks([...pendingChunksRef.current]);
        setRawTranscript(prev => prev + raw);

        const removePending = (text) => {
          correctedTextRef.current += text;
          setCorrectedText(correctedTextRef.current);
          pendingChunksRef.current = pendingChunksRef.current.filter(c => c.id !== id);
          setPendingChunks([...pendingChunksRef.current]);
        };

        if (autoCorrectRef.current && raw.trim().split(/\s+/).length >= 5) {
          correctTranscript(tokenRef.current, raw.trim(), transcribeLang)
            .then(({ corrected }) => removePending(corrected + ' '))
            .catch(() => removePending(raw));
        } else {
          removePending(raw);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    let stopping = false;
    recognition.onend = () => {
      if (isRecordingRef.current && !stopping) {
        try { recognition.start(); } catch (_) {}
      }
    };

    recognitionRef.current = recognition;
    return () => { stopping = true; recognition.stop(); };
  }, [transcribeLang]); // intentionally excludes token + autoCorrect — use refs instead

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

  /* ── Recording controls ── */
  const startRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
      setTranscriptionStopped(false);
    }
  };

  const stopRecording = () => {
    if (demoMode) {
      setDemoMode(false);
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setTranscriptionStopped(true);
    setInterimText('');

    // Flush remaining pending chunks as raw (no correction)
    const pendingRaw = pendingChunksRef.current.map(c => c.raw).join('');
    const full = (correctedTextRef.current + pendingRaw).trim();
    correctedTextRef.current = full;
    setCorrectedText(full);
    setEditedTranscript(full);
    pendingChunksRef.current = [];
    setPendingChunks([]);
  };

  const startDemo = () => { if (!isRecording && !isRealtimeStreaming) setDemoMode(true); };

  /* ── Upload file handlers ── */
  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) setUploadFile(file);
  };

  const handleTranscribeFile = async () => {
    if (!uploadFile) return;
    setIsTranscribingFile(true);
    setSaveError('');
    try {
      const { transcript } = await transcribeFile(token, uploadFile, transcribeLang);
      setRawTranscript(transcript);
      setEditedTranscript(transcript);
      correctedTextRef.current = transcript;
      setCorrectedText(transcript);
      setTranscriptionStopped(true);
      // Auto-analyze after upload transcription
      analyzeTranscript(transcript);
    } catch (err) {
      setSaveError(err.message || 'Transcription failed');
    } finally {
      setIsTranscribingFile(false);
    }
  };

  /* ── Full AI correction (post-transcription) ── */
  const runFullCorrection = async () => {
    if (!editedTranscript) return;
    setIsCorrectingFull(true);
    try {
      const { corrected } = await correctTranscript(token, editedTranscript, transcribeLang);
      if (corrected && corrected !== editedTranscript) {
        setCorrectionDiff({ original: editedTranscript, corrected });
      }
    } catch (err) {
      console.error('AI correction failed:', err);
    } finally {
      setIsCorrectingFull(false);
    }
  };

  const acceptCorrection = () => {
    if (!correctionDiff) return;
    setEditedTranscript(correctionDiff.corrected);
    setCorrectionDiff(null);
  };

  /* ── Text selection / keyword ── */
  const handleTextSelection = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel) setSelectedText(sel);
  };

  const handleTextareaDoubleClick = (e) => {
    const text = editedTranscript;
    const pos  = e.target.selectionStart;
    let start  = pos, end = pos;
    while (start > 0 && /\w/.test(text[start - 1])) start--;
    while (end < text.length && /\w/.test(text[end])) end++;
    const word = text.substring(start, end).trim();
    if (word) setSelectedText(word);
  };

  const addKeyword = () => {
    if (!selectedText || keywords.find(k => k.text === selectedText)) return;
    const clean = selectedText.trim();
    setKeywords(prev => [...prev, { text: clean, timestamp: Date.now(), source: 'manual' }]);
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
        const regex   = new RegExp(`\\b(${keyword.text})\\b`, 'gi');
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
            definition:  kw.definition || kw.explanation || '',
            source:      kw.source || 'manual',
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
      toast.success('Transcript saved!', { description: 'Summary is being generated…' });
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
    correctedTextRef.current = '';
    setCorrectedText(''); setPendingChunks([]); setInterimText('');
    setCorrectionDiff(null); setUploadFile(null);
    pendingChunksRef.current = [];
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
          <AlertDescription>{t('transcribe.browserNotSupported')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasEnoughForCorrection = editedTranscript.split(/\s+/).filter(Boolean).length >= 50;

  return (
    <div className="page" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>{t('transcribe.title')}</h1>
        <p className="card__subtitle">{t('transcribe.subtitle')}</p>
      </div>

      {saveError && (
        <Alert variant="destructive" style={{ marginBottom: '1rem' }}>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Subject */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div>
          <Label className="form-label">{t('transcribe.subjectLabel')} *</Label>
          <Input placeholder={t('transcribe.subjectPlaceholder')} value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isRecording || isRealtimeStreaming || isTranscribingFile}
            className="form-input" style={{ maxWidth: '480px' }} />
        </div>
      </div>

      {/* ── Settings bar: language + mode + autoCorrect ── */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Transcription language */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {t('transcribe.langLabel')}:
            </span>
            {Object.entries(LANG_LABELS).map(([code, label]) => (
              <button key={code} type="button"
                className={`btn btn--sm${transcribeLang === code ? '' : ' btn--ghost'}`}
                onClick={() => setTranscribeLang(code)}
                disabled={isRecording || isTranscribingFile}>
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: 'var(--card-border)' }} />

          {/* Input mode */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button type="button"
              className={`btn btn--sm${inputMode === 'live' ? '' : ' btn--ghost'}`}
              onClick={() => setInputMode('live')} disabled={isRecording || isTranscribingFile}>
              <Mic size={13} /> {t('transcribe.modeLive')}
            </button>
            <button type="button"
              className={`btn btn--sm${inputMode === 'upload' ? '' : ' btn--ghost'}`}
              onClick={() => setInputMode('upload')} disabled={isRecording || isTranscribingFile}>
              <Upload size={13} /> {t('transcribe.modeUpload')}
            </button>
          </div>

          {/* AutoCorrect toggle (live mode only) */}
          {inputMode === 'live' && (
            <>
              <div style={{ width: '1px', height: '24px', background: 'var(--card-border)' }} />
              <button type="button"
                className={`btn btn--sm${autoCorrect ? '' : ' btn--ghost'}`}
                onClick={() => setAutoCorrect(v => !v)} title="Toggle real-time AI correction">
                <Sparkles size={13} /> {t('transcribe.autoCorrect')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="transcribe-grid">
        {/* Left – Transcription area */}
        <div className="card">
          <div style={{ display: 'grid', gap: '1rem' }}>

            {/* ── LIVE MODE ── */}
            {inputMode === 'live' && (
              <>
                {/* Controls */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {!isRecording && !isRealtimeStreaming ? (
                    <>
                      <Button onClick={startRecording} className="btn">
                        <Mic size={16} /> {t('transcribe.startRecording')}
                      </Button>
                      <Button onClick={startDemo} className="btn btn--ghost">
                        <Play size={16} /> {t('transcribe.demo')}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={stopRecording} className="btn btn--danger">
                      <Square size={16} /> {t('transcribe.stopRecording')}
                    </Button>
                  )}
                  <Button onClick={() => analyzeTranscript(rawTranscript)}
                    disabled={isAnalyzing || rawTranscript.length < 50}
                    className="btn btn--ghost" title="Trigger AI keyword analysis">
                    <RefreshCw size={16} /> {isAnalyzing ? t('transcribe.analyzing') : 'Analyze'}
                  </Button>
                </div>

                {isRecording && (
                  <div className="recording-indicator">
                    <span className="recording-dot" />
                    {autoCorrect ? 'Recording + AI correcting…' : 'Recording…'}
                    {isAnalyzing ? ' (extracting keywords…)' : ''}
                  </div>
                )}

                {/* Transcript area */}
                {!transcriptionStopped ? (
                  <div className={`transcript-display${isRecording ? ' transcript-display--recording' : ''}`} onMouseUp={handleTextSelection}>
                    {correctedText || pendingChunks.length > 0 || interimText ? (
                      <>
                        <span>{correctedText}</span>
                        {pendingChunks.map(c => (
                          <span key={c.id} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {c.raw}
                          </span>
                        ))}
                        {interimText && (
                          <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{interimText}|</span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>
                        Your transcription will appear here.
                        <br /><br />
                        <small>Keywords are extracted automatically as you speak.</small>
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label className="form-label">{t('transcribe.transcriptLabel')}</Label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      💡 {t('transcribe.editHint')}
                    </p>
                    <textarea value={editedTranscript} onChange={(e) => setEditedTranscript(e.target.value)}
                      onDoubleClick={handleTextareaDoubleClick}
                      className="neon-textarea" style={{ minHeight: '300px', lineHeight: 1.8 }}
                      placeholder="Your transcript will appear here. You can edit it before saving." />
                    {editedTranscript && keywords.length > 0 && (
                      <div className="transcript-preview" style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Keywords highlighted:
                        </div>
                        {renderHighlighted(editedTranscript)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── UPLOAD MODE ── */}
            {inputMode === 'upload' && (
              <>
                {/* Drop zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => document.getElementById('audio-upload-input').click()}
                  className={`upload-zone${uploadFile ? ' upload-zone--active' : ''}`}>
                  <input id="audio-upload-input" type="file"
                    accept=".mp3,.m4a,.wav,.ogg,.webm,.flac"
                    style={{ display: 'none' }}
                    onChange={(e) => setUploadFile(e.target.files[0] || null)} />

                  {uploadFile ? (
                    <div>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎵</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {uploadFile.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                      </div>
                      <button type="button"
                        style={{ marginTop: '0.75rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: '0.75rem auto 0' }}
                        onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}>
                        <X size={12} /> Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        {t('transcribe.uploadPrompt')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t('transcribe.uploadFormats')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Transcribe button */}
                {uploadFile && !transcriptionStopped && (
                  <Button onClick={handleTranscribeFile} disabled={isTranscribingFile} className="btn">
                    {isTranscribingFile ? (
                      <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('transcribe.transcribing')}</>
                    ) : (
                      <><Upload size={16} /> {t('transcribe.transcribeBtn')}</>
                    )}
                  </Button>
                )}

                {/* Edit textarea after upload */}
                {transcriptionStopped && (
                  <div>
                    <Label className="form-label">{t('transcribe.transcriptLabel')}</Label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      💡 {t('transcribe.editHint')}
                    </p>
                    <textarea value={editedTranscript} onChange={(e) => setEditedTranscript(e.target.value)}
                      onDoubleClick={handleTextareaDoubleClick}
                      className="neon-textarea" style={{ minHeight: '300px', lineHeight: 1.8 }}
                      placeholder="Transcription result will appear here." />
                    {editedTranscript && keywords.length > 0 && (
                      <div className="transcript-preview" style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Keywords highlighted:
                        </div>
                        {renderHighlighted(editedTranscript)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Keyword selection banner ── */}
            {selectedText && (
              <div className="selection-banner">
                <span style={{ fontSize: '0.875rem', flex: 1 }}>
                  Selected: <strong style={{ color: 'var(--accent-primary)' }}>{selectedText}</strong>
                </span>
                <Button onClick={addKeyword} size="sm" className="btn btn--sm">
                  <Highlighter size={14} /> Add Keyword
                </Button>
              </div>
            )}

            {/* ── AI Correction diff panel ── */}
            {correctionDiff && (
              <div className="correction-diff-panel">
                <div className="correction-diff-panel__header">
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent-primary)', letterSpacing: '0.02em' }}>
                    ✨ {t('transcribe.correctionTitle')}
                  </span>
                  <button type="button" onClick={() => setCorrectionDiff(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', lineHeight: 1 }}>
                    <X size={14} />
                  </button>
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  <div className="correction-diff-panel__before">
                    {correctionDiff.original.slice(0, 300)}{correctionDiff.original.length > 300 ? '…' : ''}
                  </div>
                  <div className="correction-diff-panel__after">
                    {correctionDiff.corrected.slice(0, 300)}{correctionDiff.corrected.length > 300 ? '…' : ''}
                  </div>
                </div>
                <div className="correction-diff-panel__actions">
                  <button type="button" className="btn btn--sm" onClick={acceptCorrection}>
                    ✅ {t('transcribe.acceptCorrection')}
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCorrectionDiff(null)}>
                    ↩ {t('transcribe.rejectCorrection')}
                  </button>
                </div>
              </div>
            )}

            {/* ── AI correction suggestion (post-transcription) ── */}
            {transcriptionStopped && hasEnoughForCorrection && !correctionDiff && !isCorrectingFull && (
              <div className="ai-suggest-banner">
                <Sparkles size={16} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', flex: 1 }}>
                  {t('transcribe.correctBtn')}
                </span>
                <button type="button" className="btn btn--sm btn--ghost" onClick={runFullCorrection}>
                  {t('transcribe.correctBtn')}
                </button>
              </div>
            )}
            {isCorrectingFull && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                {t('transcribe.correcting')}
              </div>
            )}

            {/* ── Save / Clear ── */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button onClick={saveTranscript} disabled={!editedTranscript || isSaving || !subject} className="btn">
                <Save size={16} /> {isSaving ? t('transcribe.saving') : t('transcribe.saveBtn')}
              </Button>
              <Button onClick={clearTranscript} disabled={!rawTranscript && !editedTranscript && !uploadFile} className="btn btn--ghost">
                <Trash2 size={16} /> {t('transcribe.resetBtn')}
              </Button>
            </div>

            {isSummarizing && (
              <div style={{
                padding: '1rem', background: 'rgba(245,166,35,0.06)',
                border: '1px solid rgba(245,166,35,0.15)',
                borderRadius: '0.75rem', fontSize: '0.875rem', color: 'var(--accent-primary)' }}>
                ⏳ Summary is generated automatically after save.
              </div>
            )}
          </div>
        </div>

        {/* Right – Keywords sidebar */}
        <div className="card keyword-sidebar">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('transcribe.keywordsTitle')} ({keywords.length})
            </h3>
            {isAnalyzing && <span className="tag tag--teal" style={{ fontSize: '0.7rem' }}>{t('transcribe.analyzing')}</span>}
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
                      {kw.source && (
                        <span className={`tag tag--${kw.source === 'ai' ? 'teal' : 'yellow'}`}>
                          {kw.source === 'ai' ? t('transcribe.keywordSource_ai') : t('transcribe.keywordSource_manual')}
                        </span>
                      )}
                    </div>
                    {kw.explanation && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{kw.explanation}</div>
                    )}
                  </div>
                  <button onClick={() => removeKeyword(kw.text)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', flexShrink: 0 }}
                    title={t('transcribe.deleteKeyword')}>
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
