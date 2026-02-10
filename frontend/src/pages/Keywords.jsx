import { useState, useEffect } from 'react';
import { Edit2, Save, X, Trash2, Plus, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  getTranscripts,
  getKeywordGroupsByTranscript,
  getKeywordsBySession,
  createKeywords,
  updateKeywordDefinition,
  removeKeywordFromGroup,
  addKeywordToGroup,
} from '../api/client';
import { useAuth } from '../context/AuthContext';

const Keywords = () => {
  const { token } = useAuth();

  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState('');
  const [keywordGroups, setKeywordGroups] = useState([]);
  const [editingKeywordId, setEditingKeywordId] = useState(null);
  const [editingDefinition, setEditingDefinition] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newKeywordText, setNewKeywordText] = useState('');
  const [newKeywordDef, setNewKeywordDef] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Load transcripts on mount
  useEffect(() => {
    const loadTranscripts = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const data = await getTranscripts(token);
        setTranscripts(data);
      } catch (err) {
        console.error('Error loading transcripts:', err);
        setError('Failed to load transcripts');
      } finally {
        setLoading(false);
      }
    };

    loadTranscripts();
  }, [token]);

  // Load keyword groups when transcript is selected
  useEffect(() => {
    const loadKeywords = async () => {
      if (!selectedTranscript || !token) return;
      try {
        const transcriptObj = transcripts.find(t => t._id === selectedTranscript);
        if (transcriptObj && transcriptObj.sessionId) {
          const kws = await getKeywordsBySession(token, transcriptObj.sessionId);
          setKeywordGroups([
            {
              _id: transcriptObj.sessionId,
              transcriptId: selectedTranscript,
              keywords: kws,
            },
          ]);
        } else {
          const data = await getKeywordGroupsByTranscript(token, selectedTranscript);
          setKeywordGroups(data);
        }
      } catch (err) {
        console.error('Error loading keywords:', err);
        setError('Failed to load keywords');
      }
    };

    loadKeywords();
  }, [selectedTranscript, token, transcripts]);

  const handleEditDefinition = (keywordId, currentDefinition) => {
    setEditingKeywordId(keywordId);
    setEditingDefinition(currentDefinition);
  };

  const handleSaveDefinition = async (keywordId) => {
    if (!token || !editingDefinition.trim()) {
      setError('Definition cannot be empty');
      return;
    }

    try {
      await updateKeywordDefinition(token, keywordId, { definition: editingDefinition.trim() });
      
      // Update local state
      setKeywordGroups(prevGroups =>
        prevGroups.map(group => ({
          ...group,
          keywords: group.keywords.map(kw =>
            kw._id === keywordId ? { ...kw, definition: editingDefinition.trim() } : kw
          )
        }))
      );

      setEditingKeywordId(null);
      setEditingDefinition('');
      setSuccessMessage('Definition updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating definition:', err);
      setError(err?.payload?.error || 'Failed to update definition');
    }
  };

  const handleDeleteKeyword = async (keywordGroupId, keywordId) => {
    if (!confirm('Are you sure you want to delete this keyword?')) return;

    if (!token) {
      setError('Not authenticated');
      return;
    }

    try {
      await removeKeywordFromGroup(token, keywordGroupId, keywordId);

      // Update local state
      setKeywordGroups(prevGroups =>
        prevGroups.map(group => ({
          ...group,
          keywords: group.keywords.filter(kw => kw._id !== keywordId)
        }))
      );

      setSuccessMessage('Keyword deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting keyword:', err);
      setError(err?.payload?.error || 'Failed to delete keyword');
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeywordText.trim() || !newKeywordDef.trim() || !token || keywordGroups.length === 0) {
      setError('Please fill in both fields and select a transcript');
      return;
    }

    try {
      const keywordGroup = keywordGroups[0];
      const result = await addKeywordToGroup(token, keywordGroup._id, {
        keywordText: newKeywordText.trim(),
        definition: newKeywordDef.trim(),
      });

      setKeywordGroups([result]);
      setNewKeywordText('');
      setNewKeywordDef('');
      setSuccessMessage('Keyword added successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error adding keyword:', err);
      setError(err?.payload?.error || 'Failed to add keyword');
    }
  };

  const allKeywords = keywordGroups.flatMap(g => g.keywords);
  const filteredKeywords = allKeywords.filter(kw =>
    kw.keywordText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="page"><p>Loading...</p></div>;
  }

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 className="card__title">Manage Keywords</h1>
      <p className="card__subtitle">Edit keyword definitions for your lectures</p>

      {error && (
        <Alert variant="destructive" style={{ marginBottom: '1rem' }}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert style={{ marginBottom: '1rem', background: '#dcfce7', border: '1px solid #86efac' }}>
          <AlertDescription style={{ color: '#166534' }}>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <Label className="form-label">Select Transcript</Label>
        <select
          value={selectedTranscript}
          onChange={(e) => setSelectedTranscript(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid #ccc',
            fontSize: '1rem'
          }}
        >
          <option value="">-- Select a transcript --</option>
          {transcripts.map(transcript => (
            <option key={transcript._id} value={transcript._id}>
              {transcript.subject} - {new Date(transcript.transcribedAt).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {selectedTranscript && (
        <>
          {/* Search Bar */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#9ca3af' }} />
              <Input
                placeholder="Search keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          {/* Add New Keyword */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>Add New Keyword</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <Label className="form-label">Keyword Text</Label>
                <Input
                  placeholder="Enter keyword"
                  value={newKeywordText}
                  onChange={(e) => setNewKeywordText(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <Label className="form-label">Definition</Label>
                <textarea
                  placeholder="Enter definition"
                  value={newKeywordDef}
                  onChange={(e) => setNewKeywordDef(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                    fontFamily: 'sans-serif',
                    minHeight: '100px'
                  }}
                />
              </div>
              <Button onClick={handleAddKeyword} className="btn btn--primary" style={{ alignSelf: 'flex-start' }}>
                <Plus style={{ width: '1rem', height: '1rem' }} />
                Add Keyword
              </Button>
            </div>
          </div>

          {/* Keywords List */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
              Keywords ({filteredKeywords.length})
            </h3>

            {filteredKeywords.length === 0 ? (
              <p style={{ color: '#9ca3af' }}>
                {searchTerm ? 'No keywords found' : 'No keywords for this transcript'}
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {filteredKeywords.map(keyword => (
                  <div
                    key={keyword._id}
                    style={{
                      padding: '1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      background: '#f9fafb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{keyword.keywordText}</h4>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {editingKeywordId === keyword._id ? (
                          <>
                            <Button
                              onClick={() => handleSaveDefinition(keyword._id)}
                              size="sm"
                              className="btn btn--primary"
                            >
                              <Save style={{ width: '1rem', height: '1rem' }} />
                            </Button>
                            <Button
                              onClick={() => setEditingKeywordId(null)}
                              size="sm"
                              className="btn btn--ghost"
                            >
                              <X style={{ width: '1rem', height: '1rem' }} />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleEditDefinition(keyword._id, keyword.definition)}
                              size="sm"
                              className="btn btn--ghost"
                            >
                              <Edit2 style={{ width: '1rem', height: '1rem' }} />
                            </Button>
                            <Button
                              onClick={() => handleDeleteKeyword(keywordGroups[0]._id, keyword._id)}
                              size="sm"
                              className="btn btn--ghost"
                              style={{ color: '#dc2626' }}
                            >
                              <Trash2 style={{ width: '1rem', height: '1rem' }} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingKeywordId === keyword._id ? (
                      <textarea
                        value={editingDefinition}
                        onChange={(e) => setEditingDefinition(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          border: '2px solid #3b82f6',
                          fontSize: '0.95rem',
                          fontFamily: 'sans-serif',
                          minHeight: '80px'
                        }}
                      />
                    ) : (
                      <p style={{ margin: 0, color: '#4b5563', lineHeight: '1.6' }}>
                        {keyword.definition || 'No definition'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Keywords;
