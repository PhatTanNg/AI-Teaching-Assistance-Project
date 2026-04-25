import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Save, Trash2, Highlighter, Play, RefreshCw, Upload, Sparkles, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { toast } from 'sonner';
import { createTranscript, createKeywords, transcribeFile, correctTranscript, apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PageHint from '../components/PageHint';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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

/** Render text with inline and block LaTeX formulas using KaTeX */
function renderWithLatex(rawText) {
  if (!rawText) return null;
  // Normalize \[...\] → $$...$$ and \(...\) → $...$ before processing
  let text = rawText
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`);
  // Split on $$block$$ first, then $inline$
  const parts = [];
  let remaining = text;
  let key = 0;
  // Block math: $$...$$
  const blockRe = /\$\$([^$]+)\$\$/g;
  let lastIdx = 0;
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(<span key={key++}>{text.slice(lastIdx, m.index)}</span>);
    try {
      const html = katex.renderToString(m[1].trim(), { displayMode: true, throwOnError: false });
      parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} />);
    } catch (_) {
      parts.push(<span key={key++}>{m[0]}</span>);
    }
    lastIdx = m.index + m[0].length;
  }
  remaining = text.slice(lastIdx);

  // Inline math: $...$
  const inlineParts = remaining.split(/\$([^$\n]+)\$/g);
  inlineParts.forEach((part, i) => {
    if (i % 2 === 0) {
      if (part) parts.push(<span key={key++}>{part}</span>);
    } else {
      try {
        const html = katex.renderToString(part.trim(), { displayMode: false, throwOnError: false });
        parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} />);
      } catch (_) {
        parts.push(<span key={key++}>${part}$</span>);
      }
    }
  });
  return parts.length ? parts : text;
}

const Transcribe = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t, lang } = useLanguage();

  // Input mode + language
  const [inputMode, setInputMode]       = useState('live'); // 'live' | 'upload'
  const [transcribeLang, setTranscribeLang] = useState('vi');
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
  const tokenRef            = useRef(token);
  const autoCorrectRef      = useRef(true);
  const correctedTextRef    = useRef('');
  const pendingChunksRef    = useRef([]);
  const chunkIdRef          = useRef(0);
  const flushedChunkIdsRef  = useRef(new Set());
  const subjectRef        = useRef('');
  const keywordsRef       = useRef([]);
  const subjectInputRef   = useRef(null);
  const transcriptAreaRef = useRef(null);

  const [autoCorrect, setAutoCorrect] = useState(true);
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

  const recognitionRef      = useRef(null);
  const demoIntervalRef     = useRef(null);
  const analysisTimerRef    = useRef(null);
  const isRecordingRef      = useRef(false);
  const isAnalyzingRef      = useRef(false);
  const restartTimeoutRef   = useRef(null);
  const networkRetryRef     = useRef(0);  // consecutive network error count → exponential backoff
  const lastErrorRef        = useRef(null);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  const [isRealtimeStreaming] = useState(false);

  // Detect speech API support once at mount
  const hasSpeechSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const [subject, setSubject]                       = useState('');
  const [isSaving, setIsSaving]                     = useState(false);
  const [saveError, setSaveError]                   = useState('');
  const [isSummarizing]                             = useState(false);
  const [transcriptionStopped, setTranscriptionStopped] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [showIOSFallbackModal, setShowIOSFallbackModal] = useState(false);
  const [iosTranscribing, setIosTranscribing] = useState(false);

  // iOS MediaRecorder refs
  const mediaRecorderRef  = useRef(null);
  const mediaStreamRef    = useRef(null);
  const iosChunksRef      = useRef([]);
  const iosIntervalRef    = useRef(null);
  const transcribeLangRef = useRef(transcribeLang);
  useEffect(() => { transcribeLangRef.current = transcribeLang; }, [transcribeLang]);

  useEffect(() => { subjectRef.current = subject; }, [subject]);
  useEffect(() => { keywordsRef.current = keywords; }, [keywords]);

  // On browsers without SpeechRecognition and not iOS (iOS uses MediaRecorder), force upload mode
  useEffect(() => {
    if (!hasSpeechSupport && !isIOS) setInputMode('upload');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // iOS cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(iosIntervalRef.current);
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Speech recognition setup (re-runs only when language changes) ── */
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setBrowserSupported(false); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous    = true;
    recognition.interimResults = true;
    recognition.lang          = LANG_LOCALES[transcribeLang] || 'vi-VN';

    recognition.onresult = (event) => {
      // Successful speech data — reset network backoff counter
      networkRetryRef.current = 0;
      lastErrorRef.current = null;

      let finalChunk = '';
      let interim    = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += piece + ' ';
        else interim += piece;
      }
      console.log('[DEBUG] onresult fired — interim:', interim, '| final:', finalChunk);

      setInterimText(interim);

      if (finalChunk.trim()) {
        const id  = ++chunkIdRef.current;
        const raw = finalChunk;

        // Show raw in pending immediately
        pendingChunksRef.current = [...pendingChunksRef.current, { id, raw }];
        setPendingChunks([...pendingChunksRef.current]);
        setRawTranscript(prev => prev + raw);

        const removePending = (text) => {
          // If this chunk was already flushed as raw on stop, skip to avoid duplicates
          if (flushedChunkIdsRef.current.has(id)) return;
          correctedTextRef.current += text;
          setCorrectedText(correctedTextRef.current);
          pendingChunksRef.current = pendingChunksRef.current.filter(c => c.id !== id);
          setPendingChunks([...pendingChunksRef.current]);
          // Late onresult that fired after stopRecording — also surface in editedTranscript
          if (!isRecordingRef.current) {
            setEditedTranscript(prev => (prev ? prev + ' ' + text : text).trim());
          }
        };

        if (autoCorrectRef.current && raw.trim().split(/\s+/).length >= 5) {
          correctTranscript(tokenRef.current, raw.trim(), transcribeLang, {
            topic: subjectRef.current,
            keywords: keywordsRef.current,
          })
            .then(({ corrected }) => removePending(corrected + ' '))
            .catch(() => removePending(raw));
        } else {
          removePending(raw);
        }
      }
    };

    recognition.onerror = (event) => {
      console.log('[DEBUG] onerror:', event.error);
      // Ignore transient / expected errors — let onend handle restart
      const silent = ['no-speech', 'aborted', 'audio-capture'];
      if (silent.includes(event.error)) return;
      // Only stop for truly fatal errors (permission denied)
      const fatal = ['not-allowed', 'service-not-allowed'];
      if (fatal.includes(event.error)) {
        console.error('Speech recognition fatal error:', event.error);
        isRecordingRef.current = false;
        setIsRecording(false);
        return;
      }
      // network error: count consecutive failures for exponential backoff in onend
      if (event.error === 'network') {
        networkRetryRef.current += 1;
        lastErrorRef.current = 'network';
      }
    };

    let stopping = false;
    recognition.onend = () => {
      if (isRecordingRef.current && !stopping) {
        // Exponential backoff for network errors: 1s → 2s → 4s → 8s max
        // Normal restart: 150ms desktop / 400ms mobile (debounce for rapid-fire onend)
        let delay;
        if (lastErrorRef.current === 'network' && networkRetryRef.current > 0) {
          delay = Math.min(1000 * Math.pow(2, networkRetryRef.current - 1), 8000);
          console.log(`[DEBUG] network backoff delay: ${delay}ms (attempt ${networkRetryRef.current})`);
        } else {
          delay = isMobileDevice ? 400 : 150;
        }
        lastErrorRef.current = null; // consume — reset for next cycle
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = setTimeout(() => {
          if (isRecordingRef.current && !stopping) {
            try { recognition.start(); } catch (_) {}
          }
        }, delay);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      stopping = true;
      clearTimeout(restartTimeoutRef.current);
      recognition.stop();
    };
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
    isAnalyzingRef.current = true;
    const cleaned = text.replace(/\|/g, '').trim();
    try {
      const data = await apiClient('/api/transcribe/analyze', {
        method: 'POST',
        data: { transcript: cleaned, language: transcribeLang },
        token,
      });
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
      isAnalyzingRef.current = false;
    }
  }, [transcribeLang, token]);

  useEffect(() => {
    if (!isRecording && !demoMode) return;
    if (!rawTranscript || rawTranscript.length < 20) return;
    if (rawTranscript.length - lastAnalyzedLength < 30) return;
    if (isAnalyzingRef.current) return; // skip if analysis already in-flight
    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
    analysisTimerRef.current = setTimeout(() => analyzeTranscript(rawTranscript), 500);
    return () => { if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current); };
  }, [rawTranscript, lastAnalyzedLength, analyzeTranscript, isRecording, demoMode]);

  /* ── Periodic restart to prevent lag buildup in long sessions ── */
  useEffect(() => {
    if (!isRecording || demoMode) return;
    const interval = setInterval(() => {
      if (recognitionRef.current && isRecordingRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
        // isRecordingRef stays true → onend will restart automatically
      }
    }, 25000); // restart every 25s
    return () => clearInterval(interval);
  }, [isRecording, demoMode]);

  /* ── iOS MediaRecorder recording ── */
  const bindAndStartRecorder = (stream, mimeType) => {
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;
    iosChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) iosChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      if (!iosChunksRef.current.length) {
        // Restart if still recording (empty chunk)
        if (isRecordingRef.current) bindAndStartRecorder(mediaStreamRef.current, mimeType);
        return;
      }
      const blob = new Blob(iosChunksRef.current, { type: recorder.mimeType || 'audio/mp4' });
      iosChunksRef.current = [];

      try {
        setIosTranscribing(true);
        const ext = recorder.mimeType?.includes('webm') ? 'webm' : 'm4a';
        const file = new File([blob], `chunk.${ext}`, { type: recorder.mimeType || 'audio/mp4' });
        const { transcript } = await transcribeFile(tokenRef.current, file, transcribeLangRef.current);
        if (transcript?.trim()) {
          const updated = (correctedTextRef.current + ' ' + transcript).trim();
          correctedTextRef.current = updated;
          setCorrectedText(updated);
          setEditedTranscript(updated);
        }
      } catch (err) {
        console.error('[iOS] chunk transcription error:', err);
      } finally {
        setIosTranscribing(false);
      }

      // Restart recorder if still recording
      if (isRecordingRef.current && mediaStreamRef.current) {
        bindAndStartRecorder(mediaStreamRef.current, mimeType);
      }
    };

    recorder.start();
  };

  const startIOSRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : '';

      isRecordingRef.current = true;
      bindAndStartRecorder(stream, mimeType);

      // Flush every 8 seconds
      iosIntervalRef.current = setInterval(() => {
        if (isRecordingRef.current && mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop(); // triggers onstop → send + restart
        }
      }, 8000);

      setIsRecording(true);
      setTranscriptionStopped(false);
    } catch (err) {
      console.error('[iOS] getUserMedia error:', err);
      setShowIOSFallbackModal(true);
    }
  };

  const stopIOSRecording = () => {
    clearInterval(iosIntervalRef.current);
    isRecordingRef.current = false;

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop(); // final chunk sent via onstop; won't restart since isRecordingRef=false
    }

    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;

    setIsRecording(false);
    setTranscriptionStopped(true);
    setInterimText('');
    setPendingChunks([]);
  };

  /* ── Recording controls ── */
  const startRecording = () => {
    // Sync edited state → both ref AND state, so live display starts from the edited text
    correctedTextRef.current = editedTranscript;
    setCorrectedText(editedTranscript);
    // Clear flushed set + network backoff state for fresh session
    flushedChunkIdsRef.current.clear();
    networkRetryRef.current = 0;
    lastErrorRef.current = null;
    // Exit edit mode cleanly
    setIsEditingTranscript(false);
    if (isIOS) { startIOSRecording(); return; }
    if (recognitionRef.current) {
      // Flush any lingering previous session before starting fresh
      try { recognitionRef.current.stop(); } catch (_) {}
      isRecordingRef.current = true;
      setIsRecording(true);
      setTranscriptionStopped(false);
      // Allow stop() to settle before calling start() — avoids Chrome "already started" bug
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = setTimeout(() => {
        if (isRecordingRef.current) {
          try { recognitionRef.current.start(); } catch (_) {}
        }
      }, 150);
    }
  };

  const stopRecording = () => {
    if (isIOS) { stopIOSRecording(); return; }
    isRecordingRef.current = false; // sync before stop — prevents onend from restarting
    clearTimeout(restartTimeoutRef.current);
    if (demoMode) {
      setDemoMode(false);
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    } else if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsRecording(false);
    setTranscriptionStopped(true);
    setInterimText('');

    // Flush remaining pending chunks as raw (no correction)
    // Mark their IDs so any in-flight corrections don't double-append
    pendingChunksRef.current.forEach(c => flushedChunkIdsRef.current.add(c.id));
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
      const { corrected } = await correctTranscript(token, editedTranscript, transcribeLang, {
        topic: subject,
        keywords,
      });
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

  const handleTextareaSelect = (e) => {
    const { selectionStart, selectionEnd } = e.target;
    if (selectionStart !== selectionEnd) {
      const sel = editedTranscript.substring(selectionStart, selectionEnd).trim();
      if (sel) setSelectedText(sel);
    }
  };

  const handleTextareaDoubleClick = (e) => {
    // Use the browser's auto-selection on double-click first (may be multi-word if user had selected)
    const { selectionStart, selectionEnd } = e.target;
    if (selectionStart !== selectionEnd) {
      const sel = editedTranscript.substring(selectionStart, selectionEnd).trim();
      if (sel) { setSelectedText(sel); return; }
    }
    // Fallback: extract word under cursor
    const text = editedTranscript;
    const pos  = selectionStart;
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
    if (!subject.trim()) {
      setSaveError(t('transcribe.enterSubject'));
      subjectInputRef.current?.focus();
      subjectInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!editedTranscript.trim()) {
      setSaveError(t('transcribe.enterTranscript'));
      transcriptAreaRef.current?.focus();
      transcriptAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!token) { setSaveError(t('auth.notAuthenticated')); setTimeout(() => navigate('/signin'), 2000); return; }
    try {
      setIsSaving(true);
      const transcriptData = await createTranscript(token, { subject: subject.trim(), rawTranscript: editedTranscript.trim(), lang });

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
    if (!confirm(t('transcribe.clearConfirm'))) return;
    setRawTranscript(''); setEditedTranscript(''); setKeywords([]); setSubject('');
    setLastAnalyzedLength(0); setHoveredKeyword(null); setIsAnalyzing(false); setTranscriptionStopped(false);
    setIsEditingTranscript(false);
    correctedTextRef.current = '';
    flushedChunkIdsRef.current.clear();
    networkRetryRef.current = 0;
    lastErrorRef.current = null;
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

      <PageHint
        storageKey="aita-hint-transcribe"
        icon="🎙️"
        message={t('hints.transcribe')}
        color="#6EE7F7"
      />

      {saveError && (
        <Alert variant="destructive" style={{ marginBottom: '1rem' }}>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Subject */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div>
          <Label className="form-label">{t('transcribe.subjectLabel')} *</Label>
          <Input ref={subjectInputRef} placeholder={t('transcribe.subjectPlaceholder')} value={subject}
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

          {/* Input mode — show for all except browsers with no speech support AND not iOS */}
          {(hasSpeechSupport || isIOS) && (
            <>
              <div className="settings-divider" />
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
            </>
          )}

          {/* AI auto-correct toggle — only relevant for live mode */}
          {inputMode === 'live' && (hasSpeechSupport || isIOS) && (
            <>
              <div className="settings-divider" />
              <button
                type="button"
                className={`btn btn--sm${autoCorrect ? '' : ' btn--ghost'}`}
                onClick={() => setAutoCorrect(v => !v)}
                disabled={isTranscribingFile}
                title={autoCorrect ? 'AI correction is ON — disable for instant text' : 'AI correction is OFF — text appears immediately'}>
                <Sparkles size={13} /> {autoCorrect ? t('transcribe.autoCorrectOn') : t('transcribe.autoCorrectOff')}
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
                    className="btn btn--ghost" title={t('transcribe.analyzeTitle')}>
                    <RefreshCw size={16} /> {isAnalyzing ? t('transcribe.analyzing') : t('transcribe.analyzeBtn')}
                  </Button>
                </div>

                {isRecording && (
                  <div className="recording-indicator">
                    <span className="recording-dot" />
                    {t('transcribe.recordingIndicator')}
                    {isIOS && iosTranscribing ? ' 🎙 Đang nhận dạng...' : ''}
                    {!isIOS && isAnalyzing ? ` ${t('transcribe.extractingKeywords')}` : ''}
                  </div>
                )}
                {isIOS && isRecording && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.25rem' }}>
                    Kết quả sẽ hiển thị sau mỗi ~8 giây
                  </p>
                )}

                {/* Transcript area */}
                {isRecording ? (
                  /* During recording: live display with corrected + pending + interim */
                  <div className="transcript-display transcript-display--recording" onMouseUp={handleTextSelection}>
                    {correctedText || pendingChunks.length > 0 || interimText ? (
                      <>
                        <span>{renderWithLatex(correctedText)}</span>
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
                        {t('transcribe.recordingPrompt')}
                        <br /><br />
                        <small>{t('transcribe.autoExtractHint')}</small>
                      </span>
                    )}
                  </div>
                ) : (
                  /* Before recording OR after stopping */
                  <div>
                    <Label className="form-label">{t('transcribe.transcriptLabel')}</Label>
                    {transcriptionStopped && editedTranscript && !isEditingTranscript ? (
                      <>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          ✏️ {t('transcribe.editHint')} — {t('transcribe.clickToEdit')}
                        </p>
                        <div
                          className="transcript-display"
                          style={{ minHeight: 200, lineHeight: 1.8, cursor: 'text', padding: '0.75rem 1rem' }}
                          onClick={() => setIsEditingTranscript(true)}
                        >
                          {renderWithLatex(editedTranscript)}
                        </div>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          {transcriptionStopped ? `💡 ${t('transcribe.editHint')}` : t('transcribe.typePasteHint')}
                        </p>
                        <textarea ref={transcriptAreaRef} value={editedTranscript} onChange={(e) => { setEditedTranscript(e.target.value); correctedTextRef.current = e.target.value; }}
                          onDoubleClick={handleTextareaDoubleClick} onMouseUp={handleTextareaSelect}
                          className="neon-textarea" style={{ minHeight: '300px', lineHeight: 1.8 }}
                          placeholder={t('transcribe.textareaPH')} />
                        {transcriptionStopped && (
                          <button type="button" className="btn btn--sm btn--ghost" onClick={() => setIsEditingTranscript(false)} style={{ marginTop: '0.5rem' }}>
                            ✓ {t('transcribe.done')}
                          </button>
                        )}
                      </>
                    )}
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
                        <X size={12} /> {t('common.remove')}
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
                    {editedTranscript && !isEditingTranscript ? (
                      <>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          ✏️ {t('transcribe.editHint')} — {t('transcribe.clickToEdit')}
                        </p>
                        <div
                          className="transcript-display"
                          style={{ minHeight: 200, lineHeight: 1.8, cursor: 'text', padding: '0.75rem 1rem' }}
                          onClick={() => setIsEditingTranscript(true)}
                        >
                          {renderWithLatex(editedTranscript)}
                        </div>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          💡 {t('transcribe.editHint')}
                        </p>
                        <textarea ref={transcriptAreaRef} value={editedTranscript} onChange={(e) => { setEditedTranscript(e.target.value); correctedTextRef.current = e.target.value; }}
                          onDoubleClick={handleTextareaDoubleClick} onMouseUp={handleTextareaSelect}
                          className="neon-textarea" style={{ minHeight: '300px', lineHeight: 1.8 }}
                          placeholder={t('transcribe.resultPlaceholder')} />
                        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setIsEditingTranscript(false)} style={{ marginTop: '0.5rem' }}>
                          ✓ {t('transcribe.done')}
                        </button>
                      </>
                    )}
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
                  <Highlighter size={14} /> {t('transcribe.addKeywordBtn')}
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedText('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                  title={t('transcribe.clearSelectionTitle')}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ── AI Correction diff — shown as modal (see bottom of component) ── */}

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
            {saveError && (
              <Alert variant="destructive" style={{ marginBottom: '0.5rem' }}>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button onClick={saveTranscript} disabled={isSaving} className="btn">
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
                ⏳ {t('transcribe.summaryNote')}
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
              {t('transcribe.keywordsPlaceholder')}
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

      {/* iOS fallback modal */}
      {showIOSFallbackModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}
          onClick={() => setShowIOSFallbackModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 360, width: '100%', padding: '1.5rem', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn-close"
              type="button"
              aria-label="Đóng"
              onClick={() => setShowIOSFallbackModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem' }}
            >
              <X size={14} />
            </button>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📱</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Không thể truy cập micro
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Thiết bị của bạn không cho phép ghi âm trực tiếp. Hãy thử dùng tính năng <strong>Upload</strong> để tải file âm thanh lên và nhận dạng.
            </p>
            <Button
              className="btn"
              style={{ width: '100%' }}
              onClick={() => { setShowIOSFallbackModal(false); setInputMode('upload'); }}
            >
              <Upload size={16} /> Chuyển sang Upload
            </Button>
          </div>
        </div>
      )}
      {/* ── AI Correction diff modal ── */}
      {correctionDiff && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setCorrectionDiff(null)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 820, maxHeight: '88vh', display: 'flex', flexDirection: 'column', position: 'relative', padding: '1.5rem', gap: '1rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={16} /> ✨ {t('transcribe.correctionTitle')}
              </span>
              <button
                className="btn-close"
                type="button"
                aria-label="Đóng"
                onClick={() => setCorrectionDiff(null)}
              >
                <X size={14} />
              </button>
            </div>

            {/* Two-column comparison */}
            <div className="correction-modal-grid">
              {/* Original */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-red)', letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>
                  📄 Original
                </div>
                <div
                  style={{ flex: 1, overflowY: 'auto', fontSize: '0.82rem', lineHeight: 1.7, padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-secondary)' }}
                >
                  {correctionDiff.original}
                </div>
              </div>

              {/* Corrected */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>
                  ✨ Corrected
                </div>
                <div
                  style={{ flex: 1, overflowY: 'auto', fontSize: '0.82rem', lineHeight: 1.7, padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(110,231,247,0.05)', border: '1px solid rgba(110,231,247,0.15)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-primary)' }}
                >
                  {renderWithLatex(correctionDiff.corrected)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexShrink: 0, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCorrectionDiff(null)}>
                ↩ {t('transcribe.rejectCorrection')}
              </button>
              <button type="button" className="btn btn--sm" onClick={acceptCorrection}>
                ✅ {t('transcribe.acceptCorrection')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transcribe;
