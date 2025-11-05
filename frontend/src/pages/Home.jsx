import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Mic, FileText, BookMarked, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-gray-900 mb-4">
            {isAuthenticated 
              ? `Welcome back, ${user?.displayName ?? user?.username}!` 
              : 'Never Miss a Lecture Again'}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Real-time lecture transcription with AI-powered keyword highlighting. 
            Capture every important moment and review key concepts anytime.
          </p>
          {isAuthenticated ? (
            <Link to="/transcribe">
              <Button size="lg" className="gap-2">
                <Mic className="h-5 w-5" />
                Start Transcribing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <Mic className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-gray-900 mb-2">Live Transcription</h3>
            <p className="text-gray-600">
              Convert speech to text in real-time during your lectures with high accuracy
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-gray-900 mb-2">Smart Keywords</h3>
            <p className="text-gray-600">
              Automatically highlight important terms and concepts for quick reference
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
              <BookMarked className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-gray-900 mb-2">Definition Lookup</h3>
            <p className="text-gray-600">
              Save keywords and find their definitions later for better understanding
            </p>
          </div>
        </div>

        {isAuthenticated && (
          <div className="mt-16 max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
            <Link to="/transcripts" className="group">
              <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-gray-900 mb-1">View Transcripts</h3>
                <p className="text-sm text-gray-600">
                  Access all your past lecture transcriptions
                </p>
              </div>
            </Link>

            <Link to="/keywords" className="group">
              <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <BookMarked className="h-5 w-5 text-orange-600" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-gray-900 mb-1">Saved Keywords</h3>
                <p className="text-sm text-gray-600">
                  Review your highlighted terms and definitions
                </p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
