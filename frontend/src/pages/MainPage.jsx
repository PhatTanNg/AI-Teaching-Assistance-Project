/*
  Main React frontend for AI Teaching Assistant
  - Uses microphone to capture audio
  - Sends audio to backend via Socket.IO
  - Receives transcriptions and displays them
*/
/* global React, ReactDOM, io */
// Import React hooks
const { useState, useEffect, useRef, useCallback } = React;

// Simple icons (Mic, Save, BookOpen, Play)
// SVG Icon components for UI
const Icon = ({ path, className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);
const Mic = (p) => <Icon {...p} path="M12 1a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V4a3 3 0 0 1 3-3Zm7 10a7 7 0 0 1-14 0M12 19v4M8 23h8" />;
const Save = (p) => <Icon {...p} path="M19 21H5a2 2 0 0 1-2-2V7l4-4h9l4 4v12a2 2 0 0 1-2 2ZM7 21V10h10v11M7 3v4h8" />;
const BookOpen = (p) => <Icon {...p} path="M2 4h7a5 5 0 0 1 5 5v11a4 4 0 0 0-4-4H2zM22 4h-7a5 5 0 0 0-5 5v11a4 4 0 0 1 4-4h8z" />;
const Play = (p) => <Icon {...p} path="M5 3l14 9-14 9V3z" />;

// Basic Tabs UI components
// Tabs: Container for tabbed content
function Tabs({ value, onValueChange, children, className = "" }) {
  // Ensure onValueChange is always a function
  const safeOnValueChange = typeof onValueChange === 'function' ? onValueChange : () => {};
  return <div className={className}>{React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type === TabsList) return React.cloneElement(child, { value, onValueChange: safeOnValueChange });
    if (child.type === TabsTrigger) return React.cloneElement(child, { value, onValueChange: safeOnValueChange });
    if (child.type === TabsContent) return value === child.props.value ? child : null;
    return child;
  })}</div>;
}
// TabsList: Renders tab triggers
function TabsList({ children, value, onValueChange, className = "" }) {
  return (
    <div className={className} role="tablist">
      {React.Children.map(children, (child) => React.cloneElement(child, { value, onValueChange }))}
    </div>
  );
}
// TabsTrigger: Individual tab button
function TabsTrigger({ value: triggerValue, value, onValueChange, children, className = "" }) {
  const active = value === triggerValue;
  return (
    <button
      role="tab"
      aria-selected={active}
      className={`${className} px-3 py-2 rounded-lg border ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border'} transition-colors`}
      onClick={() => onValueChange(triggerValue)}
    >
      {children}
    </button>
  );
}
// TabsContent: Content for each tab
function TabsContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

// Types (TS-style comments for clarity)
// export interface TranscriptWord { id: string; text: string; isKeyword: boolean; timestamp: number; explanation?: string }
// export interface Session { id: string; title: string; date: Date; transcript: TranscriptWord[] }

// Demo transcript for demonstration mode
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

// TranscriptView: Displays the transcript words and highlights keywords
function TranscriptView({ transcript, isListening }) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="rounded-xl border border-border bg-card p-4 min-h-[8rem]">
        <div className="flex flex-wrap gap-2 leading-relaxed">
          {transcript.length === 0 && (
            <span className="text-muted-foreground">{isListening ? 'Listening...' : 'No transcript yet.'}</span>
          )}
          {transcript.map((w) => (
            <span
              key={w.id}
              title={w.explanation || ''}
              className={[
                w.isKeyword ? 'bg-yellow-300 text-black font-bold px-1 rounded' : '',
                w.__interim ? 'opacity-70 italic' : '',
              ].filter(Boolean).join(' ')}
            >
              {w.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// SavedSessions: Lists saved transcript sessions and allows loading/deleting
function SavedSessions({ sessions, onLoadSession, onDeleteSession }) {
  return (
    <div className="h-full overflow-auto p-4">
      <div className="space-y-3">
        {sessions.length === 0 && <div className="text-muted-foreground">No saved sessions.</div>}
        {sessions.map((s) => (
          <div key={s.id} className="border border-border bg-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-muted-foreground">{new Date(s.date).toLocaleString()} â€” {s.transcript.length} words</div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-lg border border-border" onClick={() => onLoadSession(s)}>Load</button>
              <button className="px-3 py-2 rounded-lg border border-border" onClick={() => onDeleteSession(s.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/*
  ControlPanel: Handles audio recording and communication with backend
  - Uses Web Audio API to capture microphone input
  - Converts audio to 16-bit PCM and sends to backend via Socket.IO
  - Receives transcriptions and updates transcript
*/
function ControlPanel({ isListening, onStartStop, onTranscriptUpdate, onStartDemo }) {
  // Refs for audio and socket objects
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const inputRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Create socket connection to backend
    socketRef.current = io("http://localhost:5500");
    const s = socketRef.current;

    s.on("connect_error", (err) => console.error("Socket connection error:", err));
    s.on("error", (err) => console.error("Socket error:", err));

    // Listen for transcriptions from backend
    s.on("transcription", (data) => {
      if (!data) return;
      const words = String(data.text || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (words.length === 0) return;

      const mapped = words.map((t, i) => ({
        id: `live-${Date.now()}-${i}`,
        text: t,
        isKeyword: false,
        timestamp: Date.now(),
      }));

      onTranscriptUpdate((prev) => {
        const cleaned = prev.filter((word) => !word.__interim);
        if (data.isFinal) {
          return [...cleaned, ...mapped];
        }
        const interimWords = mapped.map((item) => ({ ...item, __interim: true }));
        return [...cleaned, ...interimWords];
      });
    });

    return () => {
      s.off("transcription");
      s.off("connect_error");
      s.off("error");
      s.close();
    };
  }, [onTranscriptUpdate]);

  // Start recording and streaming audio to backend
  async function start() {
    try {
      // Create audio context (16kHz sample rate)
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioCtx({ sampleRate: 16000 });
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create audio nodes
      inputRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      // On each audio process event, convert to 16-bit PCM and send to backend
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const buffer = new ArrayBuffer(inputData.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          view.setInt16(i * 2, s * 0x7fff, true);
        }
        // Emit audio data to backend
        socketRef.current.emit("audioData", buffer);
      };

      // Connect audio nodes
      inputRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Notify backend to start streaming
      socketRef.current.emit("start");
      // Reset transcript for new session
      onTranscriptUpdate(() => []);
      onStartStop(true);
    } catch (err) {
      console.error(err);
      alert("Microphone access error!");
    }
  }

  // Stop recording and streaming
  function stop() {
    if (processorRef.current) processorRef.current.disconnect();
    if (inputRef.current) inputRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    socketRef.current.emit("stop");
    onTranscriptUpdate((prev) => prev.filter((word) => !word.__interim));
    onStartStop(false);
  }

  // UI for control panel
  return (
    <div className="px-4 pb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <button
          onClick={() => (isListening ? stop() : start())}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${isListening ? 'bg-red-600 hover:bg-red-500' : 'bg-primary hover:bg-primary/90'} text-primary-foreground`}
        >
          <Mic className="w-4 h-4" />
          {isListening ? 'Stop' : 'Start'} Listening
        </button>
        <span className={`text-xs px-2 py-1 rounded-full border ${isListening ? 'border-red-500 text-red-400' : 'border-border text-muted-foreground'}`}>
          {isListening ? 'Listening...' : 'Idle'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onStartDemo}
          disabled={isListening}
          className="px-3 py-2 rounded-lg border border-border hover:bg-card/60 disabled:opacity-50 flex items-center gap-2"
        >
          <Play className="w-4 h-4" /> Demo
        </button>
      </div>
    </div>
  );
}

/*
  App: Main application component
  - Manages state for listening, transcript, sessions, tabs, and demo mode
  - Handles saving/loading/deleting transcript sessions
  - Renders UI components
*/
function App() {
  // State hooks
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState('live');
  const [demoMode, setDemoMode] = useState(true);

  // Demo mode: Simulates transcript for demonstration
  useEffect(() => {
    if (!demoMode) return;
    setIsListening(true);
    setTranscript([]);
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex >= DEMO_LECTURE.length) {
        setIsListening(false);
        setDemoMode(false);
        clearInterval(interval);
        return;
      }
      const demoWord = DEMO_LECTURE[currentIndex];
      const newWord = {
        id: `demo-${currentIndex}`,
        text: demoWord.word,
        isKeyword: !!demoWord.isKeyword,
        timestamp: Date.now(),
        explanation: demoWord.explanation,
      };
      setTranscript((prev) => [...prev, newWord]);
      currentIndex++;
    }, 400);
    return () => clearInterval(interval);
  }, [demoMode]);

  // Handlers for control panel and session management
  const handleStartStop = (listening) => {
    setIsListening(listening);
    if (!listening) setDemoMode(false);
  };
  const handleTranscriptUpdate = useCallback((nextValue) => {
    setTranscript((prev) =>
      typeof nextValue === "function" ? nextValue(prev) : nextValue
    );
  }, []);
  const handleStartDemo = () => setDemoMode(true);

  // Save current transcript as a session
  const handleSaveSession = () => {
    const finalizedTranscript = transcript
      .filter((word) => !word.__interim)
      .map(({ __interim, ...rest }) => rest);
    if (finalizedTranscript.length === 0) return;
    const newSession = {
      id: String(Date.now()),
      title: `Lecture ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      date: new Date(),
      transcript: finalizedTranscript,
    };
    setSessions([newSession, ...sessions]);
    setTranscript([]);
    setIsListening(false);
    setActiveTab('live'); // Switch back to live tab after saving
  };
  // Load a saved session
  const handleLoadSession = (session) => {
    setTranscript(session.transcript);
    setIsListening(false); // Ensure not listening when loading a session
    setActiveTab('live');
  };
  // Delete a saved session
  const handleDeleteSession = (sessionId) => setSessions(sessions.filter((s) => s.id !== sessionId));

  // Main UI
  return (
    <div className="size-full flex flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-foreground">AITA</h1>
              <p className="text-muted-foreground text-xs">AI Teaching Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {transcript.length > 0 && activeTab === 'live' && !isListening && (
              <button onClick={handleSaveSession} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span className="text-sm">Save</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-4 pt-3 pb-2 shrink-0">
            <TabsList className="w-full grid grid-cols-2 gap-2">
              <TabsTrigger value="live" className="flex items-center gap-2"><Mic className="w-4 h-4" /> Live</TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-2"><Save className="w-4 h-4" /> Saved ({sessions.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="live" className="flex-1 flex flex-col overflow-hidden mt-0">
            <ControlPanel
              isListening={isListening}
              onStartStop={handleStartStop}
              onTranscriptUpdate={handleTranscriptUpdate}
              onStartDemo={handleStartDemo}
            />
            <TranscriptView transcript={transcript} isListening={isListening} />
          </TabsContent>

          <TabsContent value="saved" className="flex-1 overflow-hidden mt-0">
            <SavedSessions
              sessions={sessions}
              onLoadSession={handleLoadSession}
              onDeleteSession={handleDeleteSession}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Render the main App component
ReactDOM.createRoot(document.getElementById('root')).render(<App />);




