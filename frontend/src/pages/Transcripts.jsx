import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, Calendar, Eye, Edit2, Save, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  getTranscripts,
  deleteTranscript,
  updateTranscriptText,
} from '../api/client';
import { useAuth } from '../context/AuthContext';

const Transcripts = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Transcripts state
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit state
  const [editingField, setEditingField] = useState(null); // 'rawTranscript' or 'summary'
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log('[DEBUG] isDialogOpen changed:', isDialogOpen);
    console.log('[DEBUG] selectedTranscript:', selectedTranscript?._id || 'null');
  }, [isDialogOpen, selectedTranscript]);

  // Load transcripts on mount
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const transcriptData = await getTranscripts(token);
        setTranscripts(transcriptData);
      } catch (err) {
        console.error('Error loading transcripts:', err);
        setError('Failed to load transcripts');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const handleDeleteTranscript = async (transcriptId, index) => {
    if (!confirm('Are you sure you want to delete this transcript?')) return;

    try {
      await deleteTranscript(token, transcriptId);
      const updated = transcripts.filter((_, i) => i !== index);
      setTranscripts(updated);
    } catch (err) {
      console.error('Error deleting transcript:', err);
      setError('Failed to delete transcript');
    }
  };

  const viewTranscript = useCallback((transcript) => {
    if (!transcript || !transcript._id) {
      console.error('[ERROR] viewTranscript called with invalid transcript:', transcript);
      setError('Invalid transcript data');
      return;
    }
    console.log('[DEBUG] viewTranscript called with transcript:', transcript._id);
    console.log('[DEBUG] Transcript data:', { subject: transcript.subject, hasRawTranscript: !!transcript.rawTranscript });
    setSelectedTranscript(transcript);
    setIsDialogOpen(true);
  }, []);

  const startEdit = (field, currentText) => {
    setEditingField(field);
    setEditingText(currentText);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditingText('');
  };

  const handleSaveEdit = async () => {
    if (!editingText.trim()) {
      setError('Text cannot be empty');
      return;
    }

    if (!selectedTranscript || !token) return;

    try {
      setIsSaving(true);
      
      const updateData = editingField === 'rawTranscript'
        ? { rawTranscript: editingText.trim() }
        : { summary: editingText.trim() };

      const updated = await updateTranscriptText(token, selectedTranscript._id, updateData);
      
      // Update local state
      setSelectedTranscript(updated);
      setTranscripts(transcripts.map(t => t._id === updated._id ? updated : t));
      setEditingField(null);
      setEditingText('');
    } catch (err) {
      console.error('Error updating transcript:', err);
      setError('Failed to update transcript');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="page"><p>Loading transcripts...</p></div>;
  }

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="card__title">Learning Materials</h1>
          <p className="card__subtitle">Access your transcripts and auto-generated summaries</p>
        </div>
        <Button onClick={() => { console.log('[TEST] Dialog test button clicked'); setSelectedTranscript(transcripts[0]); setIsDialogOpen(true); }} size="sm">Test Dialog</Button>
      </div>

      {error && (
        <Alert variant="destructive" style={{ marginBottom: '1rem' }}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Transcripts List */}
      {transcripts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <FileText style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem', color: '#d1d5db' }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No transcripts yet</h3>
          <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
            Start transcribing your first lecture to see it here
          </p>
          <Button className="btn btn--primary" onClick={() => navigate('/transcribe')}>
            Start Transcribing
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {transcripts.map((transcript, index) => (
            <div
              key={transcript._id}
              className="card"
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  background: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileText style={{ width: '1.25rem', height: '1.25rem', color: '#0284c7' }} />
                </div>
                <button
                  onClick={() => handleDeleteTranscript(transcript._id, index)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af'
                  }}
                >
                  <Trash2 style={{ width: '1rem', height: '1rem' }} />
                </button>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', lineHeight: '1.3' }}>
                {transcript.subject || 'Untitled'}
              </h3>

              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar style={{ width: '1rem', height: '1rem' }} />
                  {new Date(transcript.transcribedAt).toLocaleDateString()}
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {transcript.rawTranscript.substring(0, 100)}...
              </p>

              {transcript.summary && (
                <div style={{ fontSize: '0.75rem', color: '#059669', marginBottom: '1rem', padding: '0.5rem', background: '#f0fdf4', borderRadius: '0.25rem' }}>
                  ✓ Summary available
                </div>
              )}

              <Button
                onClick={() => viewTranscript(transcript)}
                className="btn btn--ghost"
                style={{ width: '100%' }}
              >
                <Eye style={{ width: '1rem', height: '1rem' }} />
                View & Edit
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* View & Edit Transcript Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(newOpen) => {
        console.log('[DEBUG] Dialog onOpenChange called with:', newOpen);
        setIsDialogOpen(newOpen);
      }}>
        <DialogContent style={{ maxWidth: '900px', maxHeight: '80vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>
              {selectedTranscript?.subject ? `${selectedTranscript.subject} - View & Edit` : 'Transcript'}
            </DialogTitle>
            <DialogDescription>
              {selectedTranscript && selectedTranscript.transcribedAt 
                ? new Date(selectedTranscript.transcribedAt).toLocaleDateString() 
                : 'No date'}
            </DialogDescription>
          </DialogHeader>

          {selectedTranscript ? (
            <div style={{ marginTop: '1rem', display: 'grid', gap: '2rem' }}>
              {/* Transcript Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Transcript</h4>
                  {editingField !== 'rawTranscript' && (
                    <Button
                      onClick={() => startEdit('rawTranscript', selectedTranscript.rawTranscript)}
                      size="sm"
                      className="btn btn--ghost"
                    >
                      <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                    </Button>
                  )}
                </div>

                {editingField === 'rawTranscript' ? (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '2px solid #3b82f6',
                        fontSize: '0.95rem',
                        fontFamily: 'monospace',
                        minHeight: '200px'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        size="sm"
                        className="btn btn--primary"
                      >
                        <Save style={{ width: '0.875rem', height: '0.875rem' }} />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        onClick={cancelEdit}
                        size="sm"
                        className="btn btn--ghost"
                      >
                        <X style={{ width: '0.875rem', height: '0.875rem' }} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
                    {selectedTranscript.rawTranscript}
                  </div>
                )}
              </div>

              {/* Summary Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                    Summary {!selectedTranscript.summary && <span style={{ color: '#f59e0b', fontSize: '0.875rem' }}>(Generating...)</span>}
                  </h4>
                  {selectedTranscript.summary && editingField !== 'summary' && (
                    <Button
                      onClick={() => startEdit('summary', selectedTranscript.summary)}
                      size="sm"
                      className="btn btn--ghost"
                    >
                      <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                    </Button>
                  )}
                </div>

                {editingField === 'summary' ? (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '2px solid #3b82f6',
                        fontSize: '0.95rem',
                        fontFamily: 'sans-serif',
                        minHeight: '150px'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        size="sm"
                        className="btn btn--primary"
                      >
                        <Save style={{ width: '0.875rem', height: '0.875rem' }} />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        onClick={cancelEdit}
                        size="sm"
                        className="btn btn--ghost"
                      >
                        <X style={{ width: '0.875rem', height: '0.875rem' }} />
                      </Button>
                    </div>
                  </div>
                ) : selectedTranscript.summary ? (
                  <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '0.75rem', border: '1px solid #bbf7d0', lineHeight: '1.6', fontSize: '0.95rem' }}>
                    {selectedTranscript.summary}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.75rem', border: '1px solid #fde047', color: '#92400e', fontSize: '0.875rem' }}>
                    Summary is being auto-generated. Refresh the page to see it when ready.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
              <p>No transcript selected. Please click "View & Edit" to open a transcript.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transcripts;
