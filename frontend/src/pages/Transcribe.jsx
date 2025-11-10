import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Save, Trash2, Highlighter, Play } from 'lucide-react';
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
  const recognitionRef = useRef(null);
  const demoIntervalRef = useRef(null);

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

      setTranscript(prev => prev + finalTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        return;
      }
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
          // Avoid duplicates
          if (!prev.find(k => k.text === cleanWord)) {
            return [...prev, {
              text: cleanWord,
              timestamp: Date.now(),
              explanation: demoWord.explanation
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
      }
    };
  }, [demoMode]);

  const startRecording = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setKeywords([]);
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
    if (isRecording) return;
    setDemoMode(true);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text) {
      setSelectedText(text);
    }
  };

  const addKeyword = () => {
    if (selectedText && !keywords.find(k => k.text === selectedText)) {
      setKeywords([...keywords, { text: selectedText, timestamp: Date.now() }]);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    }
  };

  const removeKeyword = (keyword) => {
    setKeywords(keywords.filter(k => k.text !== keyword));
  };

  const highlightKeywords = (text) => {
    if (keywords.length === 0) return text;
    
    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword.text})`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-yellow-200 px-1 rounded" title="' + (keyword.explanation || '') + '">$1</mark>'
      );
    });
    return highlightedText;
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
    
    alert('Transcript saved successfully!');
  };

  const clearTranscript = () => {
    if (confirm('Are you sure you want to clear this transcript?')) {
      setTranscript('');
      setKeywords([]);
      setLectureName('');
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
        <h1 className="card__title">Live Transcription</h1>
        <p className="card__subtitle">Record your lecture and highlight important keywords</p>
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
                  disabled={isRecording}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!isRecording ? (
                  <>
                    <Button onClick={startRecording} className="btn">
                      <Mic style={{ width: '1rem', height: '1rem' }} />
                      Start Recording
                    </Button>
                    <Button onClick={startDemo} className="btn btn--ghost">
                      <Play style={{ width: '1rem', height: '1rem' }} />
                      Demo
                    </Button>
                  </>
                ) : (
                  <Button onClick={stopRecording} className="btn" style={{ background: '#dc2626' }}>
                    <Square style={{ width: '1rem', height: '1rem' }} />
                    Stop
                  </Button>
                )}
              </div>
            </div>

            {isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontSize: '0.875rem' }}>
                <div style={{ height: '0.75rem', width: '0.75rem', borderRadius: '50%', background: '#dc2626', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                <span>{demoMode ? 'Demo in progress...' : 'Recording in progress...'}</span>
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
                lineHeight: '1.8'
              }}
              onMouseUp={handleTextSelection}
              dangerouslySetInnerHTML={{ 
                __html: highlightKeywords(transcript) || '<span style="color: #9ca3af">Your transcription will appear here...</span>' 
              }}
            />

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
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: '600' }}>
            Keywords ({keywords.length})
          </h3>
          
          {keywords.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#78716c', margin: 0 }}>
              Select text from the transcript and click "Add Keyword" to highlight important terms.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '600px', overflowY: 'auto' }}>
              {keywords.map((keyword, index) => (
                <div 
                  key={index}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'space-between',
                    padding: '0.75rem', 
                    background: '#fef3c7', 
                    border: '1px solid #fde047',
                    borderRadius: '0.75rem',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ flex: '1' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      {keyword.text}
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