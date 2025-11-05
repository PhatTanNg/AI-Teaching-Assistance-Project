import { useState, useEffect } from 'react';
import { BookMarked, Search, Trash2, ExternalLink } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';

const Keywords = () => {
  const [keywords, setKeywords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingKeyword, setEditingKeyword] = useState(null);
  const [definition, setDefinition] = useState('');

  useEffect(() => {
    loadKeywords();
  }, []);

  const loadKeywords = () => {
    const saved = JSON.parse(localStorage.getItem('keywords') || '[]');
    setKeywords(saved);
  };

  const saveDefinition = (keywordText) => {
    const updated = keywords.map(kw => 
      kw.text === keywordText ? { ...kw, definition } : kw
    );
    setKeywords(updated);
    localStorage.setItem('keywords', JSON.stringify(updated));
    setEditingKeyword(null);
    setDefinition('');
  };

  const deleteKeyword = (keywordText) => {
    if (confirm('Are you sure you want to delete this keyword?')) {
      const updated = keywords.filter(kw => kw.text !== keywordText);
      setKeywords(updated);
      localStorage.setItem('keywords', JSON.stringify(updated));
    }
  };

  const startEditing = (keyword) => {
    setEditingKeyword(keyword.text);
    setDefinition(keyword.definition || '');
  };

  const searchOnline = (keyword) => {
    window.open(`https://www.google.com/search?q=define+${encodeURIComponent(keyword)}`, '_blank');
  };

  const filteredKeywords = keywords.filter(kw =>
    kw.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">Keyword Library</h1>
          <p className="text-gray-600">Manage and define your highlighted terms</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredKeywords.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <BookMarked className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">
              {searchTerm ? 'No keywords found' : 'No keywords yet'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Try a different search term'
                : 'Highlight keywords during transcription to see them here'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredKeywords.map((keyword, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-gray-900 mb-1">{keyword.text}</h3>
                    <p className="text-xs text-gray-500">
                      Added on {new Date(keyword.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => searchOnline(keyword.text)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Search online"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteKeyword(keyword.text)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete keyword"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {editingKeyword === keyword.text ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Enter definition..."
                      value={definition}
                      onChange={(e) => setDefinition(e.target.value)}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => saveDefinition(keyword.text)} size="sm">
                        Save Definition
                      </Button>
                      <Button 
                        onClick={() => {
                          setEditingKeyword(null);
                          setDefinition('');
                        }} 
                        variant="outline" 
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : keyword.definition ? (
                  <div>
                    <p className="text-gray-700 mb-3">{keyword.definition}</p>
                    <Button onClick={() => startEditing(keyword)} variant="outline" size="sm">
                      Edit Definition
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => startEditing(keyword)} variant="outline" size="sm">
                    Add Definition
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Keywords;
