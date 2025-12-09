import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Save, Trash2, Highlighter, Play, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';

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
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [selectedText, setSelectedText] = useState('');
  const [lectureName, setLectureName] = useState('');
  const [browserSupported, setBrowserSupported] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedLength, setLastAnalyzedLength] = useState(0);
  const [hoveredKeyword, setHoveredKeyword] = useState(null);
  const recognitionRef = useRef(null);
  const demoIntervalRef = useRef(null);
  const analysisTimerRef = useRef(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const processorRef = useRef(null);
  const [isRealtimeStreaming, setIsRealtimeStreaming] = useState(false);
  const keywordApiBase = (import.meta.env.VITE_KEYWORD_API_BASE || import.meta.env.VITE_API_BASE_URL || 'https://ai-teaching-assistance-project.onrender.com').replace(/\/$/, '');
  const ANALYSIS_API = `${keywordApiBase}/api/analyze`;

  useEffect(() => {
    // Check if browser supports Speech Recognition
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
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      // Ignore noisy 'no-speech' errors (often harmless)
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
    setTranscript('');
    setKeywords([]);
    setLectureName('Demo Lecture - Machine Learning');
    
    let currentIndex = 0;
    
    demoIntervalRef.current = setInterval(() => {
      if (currentIndex >= DEMO_LECTURE.length) {
        setIsRecording(false);
        setDemoMode(false);
        clearInterval(demoIntervalRef.current);
        return;
      }

      const demoWord = DEMO_LECTURE[currentIndex];
      // Add word to transcript
      setTranscript(prev => prev + demoWord.word + ' ');

      // Add keyword if it's marked as one
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

  const analyzeTranscript = useCallback(async (text) => {
    if (!text || text.length < 50) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch(ANALYSIS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
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

      setLastAnalyzedLength(text.length);
    } catch (error) {
      console.error('Error analyzing transcript:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [ANALYSIS_API]);

  useEffect(() => {
    if (!transcript || transcript.length < 50) return;
    if (transcript.length - lastAnalyzedLength < 100) return;

    if (analysisTimerRef.current) {
      clearTimeout(analysisTimerRef.current);
    }

    analysisTimerRef.current = setTimeout(() => {
      analyzeTranscript(transcript);
    }, 2000);

    return () => {
      if (analysisTimerRef.current) {
        clearTimeout(analysisTimerRef.current);
      }
    };
  }, [transcript, lastAnalyzedLength, analyzeTranscript]);

  const fetchKeywordDefinition = useCallback(async (word) => {
    try {
      const response = await fetch(ANALYSIS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: word })
      });

      if (!response.ok) {
        throw new Error('Definition lookup failed');
      }

      const data = await response.json();
      const matched = data.keywords?.find(item => item.word.toLowerCase() === word.toLowerCase());
      return matched?.definition || '';
    } catch (error) {
      console.error('Definition fetch error:', error);
      return '';
    }
  }, [ANALYSIS_API]);

  const triggerAnalysis = useCallback(() => {
    if (transcript.length > 10) {
      analyzeTranscript(transcript);
    }
  }, [transcript, analyzeTranscript]);

  const startRealtimeStream = async () => {
    let stream = null; // declare at function scope to use in handlers
    try {
      // open websocket to backend proxy
      // Always use VITE_API_BASE_URL for websocket (backend on Render)
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://ai-teaching-assistance-project.onrender.com';
      const wsUrl = apiBase.replace(/^http/, 'ws') + '/ws/realtime-proxy';
      console.log('Connecting realtime websocket to', wsUrl);
      let ws;
      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        console.error('Failed to create WebSocket', err);
        throw err;
      }
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket opened, starting audio capture');
        setIsRealtimeStreaming(true);
        setTranscript(prev => prev + '\n[Realtime connected]');
      };

      ws.onmessage = (evt) => {
        // Google Speech-to-Text responses are JSON strings
        try {
          const data = JSON.parse(evt.data);
          // Google backend sends { type: 'transcript', transcript, isFinal }
          if (data.type === 'transcript' && data.transcript) {
            if (data.isFinal) {
              setTranscript(prev => (prev ? prev + '\n' : '') + data.transcript);
            } else {
              setTranscript(prev => prev.split('\n').slice(0, -1).join('\n') + (prev.includes('\n') ? '\n' : '') + data.transcript);
            }
          }
        } catch (e) {
          // If binary or unexpected message, ignore for now
        }
      };

      ws.onerror = (e) => {
        console.error('Realtime WS error event:', e);
        console.error('WebSocket readyState:', ws.readyState);
        setTranscript(prev => prev + '\n[Error: ' + (e?.message || 'WebSocket error') + ']');
      };

      ws.onclose = (event) => {
        console.log('Realtime WS close event - code:', event.code, 'reason:', event.reason);
        console.log('[DEBUG] Cleaning up audio resources after close');
        setIsRealtimeStreaming(false);
        setTranscript(prev => prev + '\n[Realtime disconnected - code ' + event.code + ']');
        // cleanup audio nodes and streams
        if (processorRef.current) {
          try { processorRef.current.disconnect(); } catch (e) {}
          processorRef.current = null;
        }
        if (sourceNodeRef.current) {
          try { sourceNodeRef.current.disconnect(); } catch (e) {}
          sourceNodeRef.current = null;
        }
        // Stop all audio tracks
        if (stream) {
          try {
            console.log('[DEBUG] Stopping audio tracks');
            stream.getTracks().forEach(track => track.stop());
          } catch (e) {}
        }
        if (audioContextRef.current) {
          try { audioContextRef.current.close(); } catch (e) {}
          audioContextRef.current = null;
        }
      };

      // start capturing audio
      console.log('[DEBUG] Requesting microphone access...');
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[DEBUG] Microphone access granted, sample rate:', stream.getTracks()[0].getSettings().sampleRate);
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Use ScriptProcessor for reliable audio capture
      // Note: ScriptProcessor is deprecated but AudioWorklet has compatibility issues in some browsers
      // A proper AudioWorklet would require external module files, so we use the proven ScriptProcessor
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Voice Activity Detection (VAD) - only send audio when speech is detected
      let silenceCounter = 0;
      const SILENCE_THRESHOLD = 0.005; // Lower threshold for more sensitive speech detection
      const SILENCE_DURATION = 10; // frames of silence before stopping transmission
      let isSpeaking = false;

      // Helper: calculate RMS (root mean square) energy of audio frame
      function calculateRMS(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
          sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
      }

      processor.onaudioprocess = (event) => {
        try {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Calculate audio energy to detect speech
          const rms = calculateRMS(inputData);
          const hasSpeech = rms > SILENCE_THRESHOLD;

          if (hasSpeech) {
            silenceCounter = 0;
            isSpeaking = true;
          } else {
            silenceCounter++;
            if (silenceCounter >= SILENCE_DURATION) {
              isSpeaking = false;
            }
          }

          // Only send audio if we're detecting speech or still in grace period
          if (isSpeaking && ws && ws.readyState === WebSocket.OPEN) {
            const downsampled = downsampleBuffer(inputData, audioContext.sampleRate, 16000);
            const pcm16 = floatTo16BitPCM(downsampled);
            ws.send(pcm16);
            // Log every 10th frame to avoid spam
            if (Math.random() < 0.1) {
              console.log('[AUDIO] Sent frame, size:', pcm16.byteLength, 'RMS:', rms.toFixed(4));
            }
          } else {
            if (Math.random() < 0.05) {
              console.log('[AUDIO] Silence detected, RMS:', rms.toFixed(4));
            }
          }
        } catch (e) {
          console.error('Error in audio processing:', e.message);
        }
      };

      // Helper: downsample Float32Array from input sample rate to target sample rate
      function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
        if (outputSampleRate === inputSampleRate) {
          return buffer;
        }
        if (outputSampleRate > inputSampleRate) {
          throw new Error('downsampling rate should be smaller than original sample rate');
        }
        const sampleRateRatio = inputSampleRate / outputSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);
        let offsetResult = 0;
        let offsetBuffer = 0;
        while (offsetResult < newLength) {
          const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
          let accum = 0, count = 0;
          for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
          }
          result[offsetResult] = count ? (accum / count) : 0;
          offsetResult++;
          offsetBuffer = nextOffsetBuffer;
        }
        return result;
      }

      // Helper: convert Float32Array [-1,1] to 16-bit PCM ArrayBuffer (little-endian)
      function floatTo16BitPCM(float32Array) {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < float32Array.length; i++) {
          let s = Math.max(-1, Math.min(1, float32Array[i]));
          view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
      }

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      console.error('Realtime start error:', err.message);
      console.error('Stack:', err.stack);
      setIsRealtimeStreaming(false);
      // Cleanup on error
      if (stream) {
        try {
          stream.getTracks().forEach(track => track.stop());
        } catch (e) {}
      }
      alert('Unable to start realtime streaming: ' + (err.message || 'Unknown error'));
    }
  };

  const stopRealtimeStream = () => {
    console.log('[DEBUG] Stop realtime stream called');
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('[DEBUG] Closing WebSocket');
        wsRef.current.close(1000, 'User requested stop');
      } else {
        console.log('[DEBUG] WebSocket not open, readyState:', wsRef.current?.readyState);
      }
    } catch (e) {
      console.warn('Error closing realtime ws', e);
    }
    setIsRealtimeStreaming(false);
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (demoMode) {
      // Stop demo mode
      setDemoMode(false);
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
      }
      setIsRecording(false);
    } else if (recognitionRef.current) {
      // Stop real recording
      recognitionRef.current.stop();
      setIsRecording(false);
    }
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

  const highlightKeywords = (text) => {
    if (keywords.length === 0) return text;

    let parts = [{ text, isKeyword: false }];

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

  const saveTranscript = () => {
    const transcriptData = {
      name: lectureName || `Lecture ${new Date().toLocaleDateString()}`,
      content: transcript,
      keywords: keywords,
      date: new Date().toISOString(),
    };
    
    const saved = JSON.parse(localStorage.getItem('transcripts') || '[]');
    saved.push(transcriptData);
    localStorage.setItem('transcripts', JSON.stringify(saved));
    
    const savedKeywords = JSON.parse(localStorage.getItem('keywords') || '[]');
    keywords.forEach(kw => {
      if (!savedKeywords.find(k => k.text === kw.text)) {
        savedKeywords.push(kw);
      }
    });
    localStorage.setItem('keywords', JSON.stringify(savedKeywords));
    
    alert('Transcript saved successfully');
  };

  const clearTranscript = () => {
    if (confirm('Are you sure you want to clear this transcript?')) {
      setTranscript('');
      setKeywords([]);
      setLectureName('');
      setLastAnalyzedLength(0);
      setHoveredKeyword(null);
      setIsAnalyzing(false);
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

  const highlightedParts = highlightKeywords(transcript);

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '2rem clamp(1rem, 3vw, 2rem)' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="card__title">AI-Assisted Live Transcription</h1>
        <p className="card__subtitle">Capture lectures, highlight keywords, and view instant definitions</p>
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
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <Label htmlFor="lectureName" className="form-label">Lecture Name</Label>
                <Input
                  id="lectureName"
                  className="form-input"
                  placeholder="e.g., Introduction to Biology"
                  value={lectureName}
                  onChange={(e) => setLectureName(e.target.value)}
                  disabled={isRealtimeStreaming || demoMode || isRecording}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {!isRecording && !isRealtimeStreaming ? (
                  <>
                    <Button onClick={startRecording} className="btn btn--primary">
                      <Mic style={{ width: '1rem', height: '1rem' }} />
                      Start Recording
                    </Button>
                    <Button onClick={startRealtimeStream} className="btn">
                      <Mic style={{ width: '1rem', height: '1rem' }} />
                      Realtime
                    </Button>
                    <Button onClick={startDemo} className="btn btn--ghost">
                      <Play style={{ width: '1rem', height: '1rem' }} />
                      Demo
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={isRealtimeStreaming ? stopRealtimeStream : stopRecording}
                    className="btn"
                    style={{ background: '#dc2626' }}
                  >
                    <Square style={{ width: '1rem', height: '1rem' }} />
                    Stop
                  </Button>
                )}
                <Button
                  onClick={triggerAnalysis}
                  disabled={isAnalyzing || transcript.length < 50}
                  className="btn"
                  title="Manually trigger AI keyword analysis"
                >
                  <RefreshCw style={{ width: '1rem', height: '1rem' }} />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
            </div>

            {(isRecording || isRealtimeStreaming) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontSize: '0.875rem' }}>
                <div style={{ height: '0.75rem', width: '0.75rem', borderRadius: '50%', background: '#dc2626', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                <span>Recording in progress{isAnalyzing ? ' (AI analyzing...)' : ''}</span>
              </div>
            )}

            <div 
              style={{ 
                minHeight: '400px', 
                padding: '1rem', 
                background: 'rgba(249, 250, 251, 0.8)', 
                borderRadius: '0.75rem', 
                border: '2px dashed rgba(209, 213, 219, 0.8)',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.8',
                fontSize: '1rem',
                position: 'relative'
              }}
              onMouseUp={handleTextSelection}
            >
              {transcript ? (
                <span>
                  {Array.isArray(highlightedParts) ? (
                    highlightedParts.map((part, index) =>
                      part.isKeyword ? (
                        <mark
                          key={`${part.text}-${index}`}
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
                        <span key={index}>{part.text}</span>
                      )
                    )
                  ) : (
                    highlightedParts
                  )}
                </span>
              ) : (
                <span style={{ color: '#9ca3af' }}>
                  Your transcription will appear here.
                  <br />
                  <br />
                  <small>The assistant will extract keywords and definitions automatically as you speak.</small>
                </span>
              )}
            </div>

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

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button onClick={saveTranscript} disabled={!transcript} className="btn">
                <Save style={{ width: '1rem', height: '1rem' }} />
                Save Transcript
              </Button>
              <Button onClick={clearTranscript} disabled={!transcript} className="btn btn--ghost">
                <Trash2 style={{ width: '1rem', height: '1rem' }} />
                Clear
              </Button>
            </div>
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