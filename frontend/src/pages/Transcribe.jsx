import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Save, Trash2, Highlighter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';

const Transcribe = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [selectedText, setSelectedText] = useState('');
  const [lectureName, setLectureName] = useState('');
  const [browserSupported, setBrowserSupported] = useState(true);
  const recognitionRef = useRef(null);

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
        // Restart if no speech detected
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

  const startRecording = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setKeywords([]);
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
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
        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
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
    
    // In a real app, this would save to a database
    const saved = JSON.parse(localStorage.getItem('transcripts') || '[]');
    saved.push(transcriptData);
    localStorage.setItem('transcripts', JSON.stringify(saved));
    
    // Also save keywords to keywords library
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
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Alert variant="destructive">
            <AlertDescription>
              Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-gray-900 mb-2">Live Transcription</h1>
          <p className="text-gray-600">Record your lecture and highlight important keywords</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Transcription Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Label htmlFor="lectureName">Lecture Name</Label>
                  <Input
                    id="lectureName"
                    placeholder="e.g., Introduction to Biology"
                    value={lectureName}
                    onChange={(e) => setLectureName(e.target.value)}
                    disabled={isRecording}
                  />
                </div>
                <div className="flex gap-2 pt-6">
                  {!isRecording ? (
                    <Button onClick={startRecording} className="gap-2">
                      <Mic className="h-4 w-4" />
                      Start
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} variant="destructive" className="gap-2">
                      <Square className="h-4 w-4" />
                      Stop
                    </Button>
                  )}
                </div>
              </div>

              {isRecording && (
                <div className="mb-4 flex items-center gap-2 text-red-600">
                  <div className="h-3 w-3 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-sm">Recording in progress...</span>
                </div>
              )}

              <div 
                className="min-h-[400px] p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 whitespace-pre-wrap"
                onMouseUp={handleTextSelection}
                dangerouslySetInnerHTML={{ __html: highlightKeywords(transcript) || '<span class="text-gray-400">Your transcription will appear here...</span>' }}
              />

              {selectedText && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="text-sm flex-1">
                    Selected: <strong>{selectedText}</strong>
                  </span>
                  <Button onClick={addKeyword} size="sm" className="gap-2">
                    <Highlighter className="h-4 w-4" />
                    Add as Keyword
                  </Button>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button onClick={saveTranscript} disabled={!transcript} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Transcript
                </Button>
                <Button onClick={clearTranscript} disabled={!transcript} variant="outline" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Keywords Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-20">
              <h3 className="text-gray-900 mb-4">Keywords ({keywords.length})</h3>
              
              {keywords.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Select text from the transcript and click "Add as Keyword" to highlight important terms.
                </p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {keywords.map((keyword, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg group"
                    >
                      <span className="text-sm flex-1">{keyword.text}</span>
                      <button
                        onClick={() => removeKeyword(keyword.text)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transcribe;
