import { useState, useEffect } from 'react';
import { FileText, Trash2, Calendar, Tag, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const Transcripts = () => {
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = () => {
    const saved = JSON.parse(localStorage.getItem('transcripts') || '[]');
    setTranscripts(saved);
  };

  const deleteTranscript = (index) => {
    if (confirm('Are you sure you want to delete this transcript?')) {
      const updated = transcripts.filter((_, i) => i !== index);
      localStorage.setItem('transcripts', JSON.stringify(updated));
      setTranscripts(updated);
    }
  };

  const viewTranscript = (transcript) => {
    setSelectedTranscript(transcript);
    setIsDialogOpen(true);
  };

  const highlightKeywords = (text, keywords) => {
    if (!keywords || keywords.length === 0) return text;
    
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Saved Transcripts</h1>
          <p className="text-gray-600">Access all your lecture transcriptions</p>
        </div>

        {transcripts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">No transcripts yet</h3>
            <p className="text-gray-600 mb-6">
              Start transcribing your first lecture to see it here
            </p>
            <Button asChild>
              <a href="/transcribe">Start Transcribing</a>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transcripts.map((transcript, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <button
                    onClick={() => deleteTranscript(index)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <h3 className="text-gray-900 mb-2 line-clamp-1">{transcript.name}</h3>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(transcript.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {transcript.keywords?.length || 0} keywords
                  </div>
                </div>

                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {transcript.content.substring(0, 150)}...
                </p>

                <Button
                  onClick={() => viewTranscript(transcript)}
                  variant="outline"
                  className="w-full gap-2"
                  size="sm"
                >
                  <Eye className="h-4 w-4" />
                  View Full Transcript
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTranscript?.name}</DialogTitle>
              <DialogDescription>
                {selectedTranscript && new Date(selectedTranscript.date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTranscript && (
              <div className="mt-4">
                <div className="mb-4">
                  <h4 className="text-sm mb-2">Keywords:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTranscript.keywords?.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                      >
                        {keyword.text}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: highlightKeywords(selectedTranscript.content, selectedTranscript.keywords)
                    }}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Transcripts;
