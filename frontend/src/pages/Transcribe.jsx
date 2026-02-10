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

  // Recording & transcript state
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
  
  // Recording state refs
  const recognitionRef = useRef(null);
  const demoIntervalRef = useRef(null);
  const analysisTimerRef = useRef(null);
  const [isRealtimeStreaming, setIsRealtimeStreaming] = useState(false);

  // Form state
  const [subject, setSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [transcriptionStopped, setTranscriptionStopped] = useState(false);

  // Keyword analysis API
  const ANALYSIS_API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '') + '/api/analyze';

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setBrowserSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      setRawTranscript(prev => {
        const cleanedPrev = prev.replace(/\s*\|.*\|$/, '');
        if (finalTranscript) {
          return cleanedPrev + finalTranscript;
        }
        return cleanedPrev + (interimTranscript ? ' |' + interimTranscript + '|' : '');
      });
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  // Demo mode effect
  useEffect(() => {
    if (!demoMode) return;

    setIsRecording(true);
    setTranscriptionStopped(false);
    setRawTranscript('');
    setEditedTranscript('');
    setKeywords([]);
    
    let currentIndex = 0;
    
    demoIntervalRef.current = setInterval(() => {
      if (currentIndex >= DEMO_LECTURE.length) {
        setIsRecording(false);
        setDemoMode(false);
        setTranscriptionStopped(true);
        clearInterval(demoIntervalRef.current);
        return;
      }

      const demoWord = DEMO_LECTURE[currentIndex];
      setRawTranscript(prev => prev + demoWord.word + ' ');

      if (demoWord.isKeyword) {
        setKeywords(prev => {
          const cleanWord = demoWord.word.replace(/[.,!?;]$/, '');
          if (!prev.find(k => k.text === cleanWord)) {
            return [...prev, {
              text: cleanWord,
              timestamp: Date.now(),
              explanation: demoWord.explanation,
              source: 'demo'
            }];
          }
          return prev;
        });
      }

      currentIndex++;
    }, 400);

    return () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
      setIsRecording(false);
      setDemoMode(false);
    };
  }, [demoMode]);

  // Auto-analyze transcript as user speaks
  const analyzeTranscript = useCallback(async (text) => {
    if (!text || text.length < 20) return;

    setIsAnalyzing(true);
    const cleanedText = text.replace(/\|/g, '').trim();
    
    try {
      const response = await fetch(ANALYSIS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: cleanedText })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.keywords && data.keywords.length > 0) {
        setKeywords(prevKeywords => {
          const updated = [...prevKeywords];

          data.keywords.forEach(kw => {
            const existingIndex = updated.findIndex(
              current => current.text.toLowerCase() === kw.word.toLowerCase()
            );

            if (existingIndex >= 0) {
              const existing = updated[existingIndex];
              if (!existing.explanation && kw.definition) {
                updated[existingIndex] = {
                  ...existing,
                  explanation: kw.definition,
                  source: existing.source || 'ai'
                };
              }
            } else {
              updated.push({
                text: kw.word,
                explanation: kw.definition,
                timestamp: Date.now(),
                source: 'ai'
              });
            }
          });

          return updated;
        });
      }

      setLastAnalyzedLength(cleanedText.length);
    } catch (error) {
      console.error('[KEYWORD] Error analyzing transcript:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [ANALYSIS_API]);

  // Trigger analysis periodically while recording
  useEffect(() => {
    if (!isRecording && !demoMode) return;
    if (!rawTranscript || rawTranscript.length < 20) return;
    if (rawTranscript.length - lastAnalyzedLength < 30) return;

    if (analysisTimerRef.current) {
      clearTimeout(analysisTimerRef.current);
    }

    analysisTimerRef.current = setTimeout(() => {
      analyzeTranscript(rawTranscript);
    }, 500);

    return () => {
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
      }
    };
  }, [rawTranscript, lastAnalyzedLength, analyzeTranscript, isRecording, demoMode]);

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
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
      }
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setTranscriptionStopped(true);
    
    // Initialize edited transcript with raw transcript content
    setEditedTranscript(rawTranscript.replace(/\|/g, '').trim());
  };

  const startDemo = () => {
    if (isRecording || isRealtimeStreaming) return;
    setDemoMode(true);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text) {
      setSelectedText(text);
    }
  };

  const handleTextareaDoubleClick = (event) => {
    // Get the word where the double-click occurred
    const text = editedTranscript;
    const clickPosition = event.target.selectionStart;
    
    // Find word boundaries
    let start = clickPosition;
    let end = clickPosition;
    
    while (start > 0 && /\w/.test(text[start - 1])) {
      start--;
    }
    while (end < text.length && /\w/.test(text[end])) {
      end++;
    }
    
    const word = text.substring(start, end).trim();
    if (word) {
      setSelectedText(word);
    }
  };

  const fetchKeywordDefinition = useCallback(async (word) => {
    try {
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`);
      
      if (!response.ok) {
        const titleCased = word.charAt(0).toUpperCase() + word.slice(1);
        const fallbackResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titleCased)}`);
        
        if (!fallbackResponse.ok) {
          return '';
        }
        
        const data = await fallbackResponse.json();
        const extract = data.extract || '';
        return extract.substring(0, 150) + (extract.length > 150 ? '...' : '');
      }

      const data = await response.json();
      const extract = data.extract || '';
      return extract.substring(0, 150) + (extract.length > 150 ? '...' : '');
    } catch (error) {
      console.error('Definition fetch error:', error);
      return '';
    }
  }, []);

  const addKeyword = async () => {
    if (!selectedText || keywords.find(k => k.text === selectedText)) {
      return;
    }

    const cleanSelection = selectedText.trim();
    let explanation = '';
    if (cleanSelection.length > 2) {
      explanation = await fetchKeywordDefinition(cleanSelection);
    }

    setKeywords(prev => [
      ...prev,
      {
        text: cleanSelection,
        timestamp: Date.now(),
        explanation: explanation || undefined,
        source: 'manual'
      }
    ]);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  const removeKeyword = (keyword) => {
    setKeywords(prev => prev.filter(k => k.text !== keyword));
  };

  const highlightSentence = (sentenceText) => {
    if (keywords.length === 0) return sentenceText;

    let parts = [{ text: sentenceText, isKeyword: false }];

    keywords.forEach(keyword => {
      const newParts = [];
      parts.forEach(part => {
        if (part.isKeyword) {
          newParts.push(part);
          return;
        }

        const regex = new RegExp(`\\b(${keyword.text})\\b`, 'gi');
        const matches = [...part.text.matchAll(regex)];

        if (matches.length === 0) {
          newParts.push(part);
          return;
        }

        let lastIndex = 0;
        matches.forEach(match => {
          if (match.index > lastIndex) {
            newParts.push({ text: part.text.slice(lastIndex, match.index), isKeyword: false });
          }
          newParts.push({ text: match[0], isKeyword: true, keyword });
          lastIndex = match.index + match[0].length;
        });

        if (lastIndex < part.text.length) {
          newParts.push({ text: part.text.slice(lastIndex), isKeyword: false });
        }
      });
      parts = newParts;
    });

    return parts;
  };

  /**
   * Save transcript workflow:
   * 1. Send edited transcript to backend
   * 2. Backend automatically generates summary using OpenAI API
   * 3. Backend creates StudySession linking transcript and summary
   * 4. If keywords exist, save them to the database with sessionId
   * 5. Summary is stored in the transcript record
   * 6. User is redirected to transcripts page
   */
  const saveTranscript = async () => {
    setSaveError('');

    if (!subject.trim() || !editedTranscript.trim()) {
      setSaveError('Please enter a subject and provide a transcript');
      return;
    }

    if (!token) {
      setSaveError('Not authenticated. Please log in again.');
      setTimeout(() => navigate('/signin'), 2000);
      return;
    }

    try {
      setIsSaving(true);

      console.log('[SAVE] Starting transcript save with token present:', !!token);

      // Save transcript with edited content
      // The backend will automatically trigger OpenAI summarization and create StudySession
      const transcriptData = await createTranscript(token, {
        subject: subject.trim(),
        rawTranscript: editedTranscript.trim(),
      });

      console.log('[SAVE] Transcript created:', transcriptData._id);
      console.log('[SAVE] Session ID:', transcriptData.sessionId);

      // Save keywords ONLY after transcript is successfully created
      // Keywords are persisted with the sessionId
      if (keywords && keywords.length > 0) {
        try {
          console.log('[SAVE] Saving', keywords.length, 'keywords with sessionId:', transcriptData.sessionId);
          const keywordData = keywords.map(kw => ({
            keywordText: typeof kw === 'string' ? kw : kw.keywordText || kw.word || kw.text,
            definition: kw.definition || kw.explanation || '',
            source: kw.source || 'manual'
          }));

          const savedKeywords = await createKeywords(token, {
            sessionId: transcriptData.sessionId,
            keywords: keywordData
          });
          console.log('[SAVE] Keywords saved successfully:', savedKeywords.length);
        } catch (keywordError) {
          console.error('[SAVE] Error saving keywords:', keywordError);
          // Don't fail the entire save if keywords fail - info the user but continue
          setSaveError(`Transcript saved but keywords failed to save: ${keywordError?.payload?.error || keywordError?.message}`);
        }
      } else {
        console.log('[SAVE] No keywords to save');
      }

      // Clear form
      setRawTranscript('');
      setEditedTranscript('');
      setKeywords([]);
      setSelectedText('');
      setLastAnalyzedLength(0);
      setHoveredKeyword(null);
      setSubject('');
      setTranscriptionStopped(false);

      alert('Transcript saved successfully! Summary is being generated...');
      // Navigate to transcripts page
      navigate('/transcripts');
    } catch (error) {
      console.error('[SAVE] Error saving transcript:', error);
      const errorMsg = error?.payload?.error || error?.message || 'Failed to save transcript';
      
      // If auth error, offer re-login
      if (error?.status === 401 || error?.status === 403 || errorMsg.includes('token') || errorMsg.includes('authenticated')) {
        setSaveError(`Authentication error: ${errorMsg}. Please log in again.`);
        setTimeout(() => navigate('/signin'), 2000);
      } else {
        setSaveError(errorMsg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const clearTranscript = () => {
    if (confirm('Are you sure you want to clear this transcript?')) {
      setRawTranscript('');
      setEditedTranscript('');
      setKeywords([]);
      setSubject('');
      setLastAnalyzedLength(0);
      setHoveredKeyword(null);
      setIsAnalyzing(false);
      setTranscriptionStopped(false);
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
        analysisTimerRef.current = null;
      }
    }
  };

  if (!browserSupported) {
    return (
      <div className="page">
        <Alert variant="destructive">
          <AlertDescription>
            Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '2rem clamp(1rem, 3vw, 2rem)' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="card__title">AI-Assisted Live Transcription</h1>
        <p className="card__subtitle">Capture lectures, highlight keywords, and auto-generate summaries</p>
      </div>

      {/* Error Alert */}
      {saveError && (
        <Alert variant="destructive" style={{ marginBottom: '1rem' }}>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Form Controls */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {/* Subject Input */}
          <div>
            <Label className="form-label">Subject/Course Name *</Label>
            <Input
              placeholder="e.g., Machine Learning 101"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isRecording || isRealtimeStreaming}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', 
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* Left Column - Main Transcription */}
        <div className="card">
          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Recording Controls */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {!isRecording && !isRealtimeStreaming ? (
                <>
                  <Button onClick={startRecording} className="btn btn--primary">
                    <Mic style={{ width: '1rem', height: '1rem' }} />
                    Start Recording
                  </Button>
                  <Button onClick={startDemo} className="btn btn--ghost">
                    <Play style={{ width: '1rem', height: '1rem' }} />
                    Demo
                  </Button>
                </>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="btn"
                  style={{ background: '#dc2626' }}
                >
                  <Square style={{ width: '1rem', height: '1rem' }} />
                  Stop Recording
                </Button>
              )}
              <Button
                onClick={() => analyzeTranscript(rawTranscript)}
                disabled={isAnalyzing || rawTranscript.length < 50}
                className="btn"
                title="Manually trigger AI keyword analysis"
              >
                <RefreshCw style={{ width: '1rem', height: '1rem' }} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </Button>
            </div>

            {(isRecording || isRealtimeStreaming) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontSize: '0.875rem' }}>
                <div style={{ height: '0.75rem', width: '0.75rem', borderRadius: '50%', background: '#dc2626', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                <span>Recording in progress{isAnalyzing ? ' (AI analyzing...)' : ''}</span>
              </div>
            )}

            {/* Transcript Display/Edit */}
            {!transcriptionStopped ? (
              // While recording: show read-only display
              <div 
                style={{ 
                  minHeight: '400px', 
                  padding: '1rem', 
                  background: 'rgba(249, 250, 251, 0.8)', 
                  borderRadius: '0.75rem', 
                  border: '2px dashed rgba(209, 213, 219, 0.8)',
                  lineHeight: '1.8',
                  fontSize: '1rem',
                  position: 'relative',
                  wordWrap: 'break-word',
                  overflowY: 'auto'
                }}
                onMouseUp={handleTextSelection}
              >
                {rawTranscript ? (
                  <div>
                    {rawTranscript.split(/(?<=[.,!?])\s+/).filter(s => s.trim()).map((sentence, sentenceIndex) => {
                      const cleanSentence = sentence.replace(/\|/g, '').trim();
                      const highlightedParts = highlightSentence(cleanSentence);
                      
                      return (
                        <div key={sentenceIndex} style={{ marginBottom: '0.5rem' }}>
                          {Array.isArray(highlightedParts) ? (
                            highlightedParts.map((part, partIndex) =>
                              part.isKeyword ? (
                                <mark
                                  key={`${part.text}-${sentenceIndex}-${partIndex}`}
                                  style={{
                                    background: part.keyword.source === 'ai' ? '#dbeafe' : '#fef3c7',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    border: part.keyword.source === 'ai' ? '1px solid #93c5fd' : '1px solid #fde047'
                                  }}
                                  onMouseEnter={() => setHoveredKeyword(part.keyword)}
                                  onMouseLeave={() => setHoveredKeyword(null)}
                                >
                                  {part.text}
                                  {hoveredKeyword === part.keyword && part.keyword.explanation && (
                                    <span
                                      style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        marginBottom: '8px',
                                        padding: '8px 12px',
                                        background: '#1f2937',
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        width: '240px',
                                        zIndex: 1000,
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                        pointerEvents: 'none'
                                      }}
                                    >
                                      {part.keyword.explanation}
                                      <span
                                        style={{
                                          position: 'absolute',
                                          top: '100%',
                                          left: '50%',
                                          transform: 'translateX(-50%)',
                                          width: 0,
                                          height: 0,
                                          borderLeft: '6px solid transparent',
                                          borderRight: '6px solid transparent',
                                          borderTop: '6px solid #1f2937'
                                        }}
                                      />
                                    </span>
                                  )}
                                </mark>
                              ) : (
                                <span key={`${sentenceIndex}-${partIndex}`}>{part.text}</span>
                              )
                            )
                          ) : (
                            <span>{cleanSentence}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ color: '#9ca3af' }}>
                    Your transcription will appear here.
                    <br />
                    <br />
                    <small>The assistant will extract keywords and definitions automatically as you speak.</small>
                  </span>
                )}
              </div>
            ) : (
              // After stop: show editable textarea with keyword highlighting
              <div>
                <Label style={{ marginBottom: '0.5rem', display: 'block' }}>Edit Transcript</Label>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>💡 Double-click a word to add it as a keyword</p>
                <textarea
                  value={editedTranscript}
                  onChange={(e) => setEditedTranscript(e.target.value)}
                  onDoubleClick={handleTextareaDoubleClick}
                  style={{
                    width: '100%',
                    minHeight: '300px',
                    padding: '1rem',
                    border: '2px solid #93c5fd',
                    borderRadius: '0.75rem',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    lineHeight: '1.8',
                    resize: 'vertical',
                  }}
                  placeholder="Your transcript will appear here. You can edit it before saving."
                />
                
                {/* Keyword highlighting preview */}
                {editedTranscript && keywords.length > 0 && (
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      background: 'rgba(249, 250, 251, 0.8)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      lineHeight: '1.8',
                      fontSize: '0.95rem',
                      minHeight: '100px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600 }}>Keywords highlighted:</div>
                    <div>
                      {editedTranscript.split(/(?<=[.,!?])\s+/).filter(s => s.trim()).map((sentence, sentenceIndex) => {
                        const cleanSentence = sentence.replace(/\|/g, '').trim();
                        const highlightedParts = highlightSentence(cleanSentence);
                        
                        return (
                          <div key={sentenceIndex} style={{ marginBottom: '0.25rem' }}>
                            {Array.isArray(highlightedParts) ? (
                              highlightedParts.map((part, partIndex) =>
                                part.isKeyword ? (
                                  <mark
                                    key={`${part.text}-${sentenceIndex}-${partIndex}`}
                                    style={{
                                      background: part.keyword.source === 'ai' ? '#dbeafe' : '#fef3c7',
                                      padding: '2px 4px',
                                      borderRadius: '3px',
                                      border: part.keyword.source === 'ai' ? '1px solid #93c5fd' : '1px solid #fde047'
                                    }}
                                  >
                                    {part.text}
                                  </mark>
                                ) : (
                                  <span key={`${sentenceIndex}-${partIndex}`}>{part.text}</span>
                                )
                              )
                            ) : (
                              <span>{cleanSentence}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedText && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                padding: '0.75rem', 
                background: '#fef3c7', 
                border: '1px solid #fde047',
                borderRadius: '0.75rem' 
              }}>
                <span style={{ fontSize: '0.875rem', flex: '1' }}>
                  Selected: <strong>{selectedText}</strong>
                </span>
                <Button onClick={addKeyword} size="sm" className="btn">
                  <Highlighter style={{ width: '1rem', height: '1rem' }} />
                  Add Keyword
                </Button>
              </div>
            )}

            {/* Save/Clear Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button
                onClick={saveTranscript}
                disabled={!editedTranscript || isSaving || !subject}
                className="btn"
              >
                <Save style={{ width: '1rem', height: '1rem' }} />
                {isSaving ? 'Saving...' : 'Save Transcript'}
              </Button>
              <Button 
                onClick={clearTranscript} 
                disabled={!rawTranscript && !editedTranscript} 
                className="btn btn--ghost"
              >
                <Trash2 style={{ width: '1rem', height: '1rem' }} />
                Clear
              </Button>
            </div>

            {isSummarizing && (
              <div style={{
                padding: '1rem',
                background: '#dbeafe',
                border: '1px solid #93c5fd',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                color: '#0c4a6e'
              }}>
                ⏳ Generating summary... This will happen automatically after you save.
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Keywords Sidebar */}
        <div className="card" style={{ background: '#fffbeb', position: 'sticky', top: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
              Keywords ({keywords.length})
            </h3>
            {isAnalyzing && (
              <span style={{ fontSize: '0.75rem', color: '#78716c' }}>AI analyzing...</span>
            )}
          </div>
          
          {keywords.length === 0 ? (
            <div style={{ fontSize: '0.875rem', color: '#78716c' }}>
              AI extracted keywords and manual selections will appear here with definitions.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '600px', overflowY: 'auto' }}>
              {keywords.map((keyword, index) => (
                <div 
                  key={`${keyword.text}-${index}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'space-between',
                    padding: '0.75rem', 
                    background: keyword.source === 'ai' ? '#dbeafe' : keyword.source === 'manual' ? '#fef3c7' : '#ede9fe',
                    border: keyword.source === 'ai' ? '1px solid #93c5fd' : '1px solid #fde047',
                    borderRadius: '0.75rem',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ flex: '1' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {keyword.text}
                      {keyword.source && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            background: keyword.source === 'ai' ? '#3b82f6' : '#f59e0b',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}
                        >
                          {keyword.source}
                        </span>
                      )}
                    </div>
                    {keyword.explanation && (
                      <div style={{ fontSize: '0.75rem', color: '#78716c', lineHeight: '1.4' }}>
                        {keyword.explanation}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeKeyword(keyword.text)}
                    style={{ 
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      padding: '0.25rem',
                      flexShrink: 0
                    }}
                    title="Remove keyword"
                  >
                    <Trash2 style={{ width: '1rem', height: '1rem' }} />
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