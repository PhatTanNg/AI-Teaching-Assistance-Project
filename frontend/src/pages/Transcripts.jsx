import { useState, useEffect } from 'react';
import { FileText, Trash2, Calendar, Tag, Eye, Plus, Edit2, Save, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
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
  getSummariesBySubject,
  createSummary,
  updateSummaryText,
  deleteSummary,
  getSubjects,
} from '../api/client';
import { useAuth } from '../context/AuthContext';

const Transcripts = () => {
  const { token } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState('transcripts'); // 'transcripts' or 'modules'

  // Transcripts state
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modules/Summaries state
  const [subjects, setSubjects] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [editingSummaryId, setEditingSummaryId] = useState(null);
  const [editingSummaryText, setEditingSummaryText] = useState('');
  const [newSummaryTranscriptId, setNewSummaryTranscriptId] = useState('');
  const [newSummaryText, setNewSummaryText] = useState('');
  const [creatingSummary, setCreatingSummary] = useState(false);

  // Load transcripts on mount
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const transcriptData = await getTranscripts(token);
        setTranscripts(transcriptData);
        
        const subjectData = await getSubjects(token);
        setSubjects(subjectData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  // Load summaries for each subject
  useEffect(() => {
    const loadSummaries = async () => {
      if (!token || subjects.length === 0) return;
      try {
        const allSummaries = {};
        for (const subject of subjects) {
          const data = await getSummariesBySubject(token, subject._id);
          allSummaries[subject._id] = data;
        }
        setSummaries(allSummaries);
      } catch (err) {
        console.error('Error loading summaries:', err);
      }
    };

    loadSummaries();
  }, [token, subjects]);

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

  const viewTranscript = (transcript) => {
    setSelectedTranscript(transcript);
    setIsDialogOpen(true);
  };

  const handleEditSummary = (summaryId, currentText) => {
    setEditingSummaryId(summaryId);
    setEditingSummaryText(currentText);
  };

  const handleSaveSummary = async (summaryId, transcriptSubjectId) => {
    if (!token || !editingSummaryText.trim()) {
      setError('Summary text cannot be empty');
      return;
    }

    try {
      await updateSummaryText(token, summaryId, { text: editingSummaryText.trim() });
      
      // Update local state
      setSummaries(prevSummaries => ({
        ...prevSummaries,
        [transcriptSubjectId]: prevSummaries[transcriptSubjectId].map(s =>
          s._id === summaryId ? { ...s, text: editingSummaryText.trim() } : s
        )
      }));

      setEditingSummaryId(null);
      setEditingSummaryText('');
    } catch (err) {
      console.error('Error updating summary:', err);
      setError('Failed to update summary');
    }
  };

  const handleDeleteSummary = async (summaryId, transcriptSubjectId) => {
    if (!confirm('Are you sure you want to delete this summary?')) return;

    try {
      await deleteSummary(token, summaryId);
      
      setSummaries(prevSummaries => ({
        ...prevSummaries,
        [transcriptSubjectId]: prevSummaries[transcriptSubjectId].filter(s => s._id !== summaryId)
      }));
    } catch (err) {
      console.error('Error deleting summary:', err);
      setError('Failed to delete summary');
    }
  };

  const handleCreateSummary = async () => {
    if (!newSummaryTranscriptId.trim() || !newSummaryText.trim() || !token) {
      setError('Please select a transcript and enter summary text');
      return;
    }

    try {
      setCreatingSummary(true);
      const selectedTr = transcripts.find(t => t._id === newSummaryTranscriptId);
      if (!selectedTr) {
        setError('Transcript not found');
        return;
      }

      const newSummary = await createSummary(token, {
        transcriptId: newSummaryTranscriptId,
        lectureId: selectedTr.lectureId._id,
        subjectId: selectedTr.subjectId._id,
        text: newSummaryText.trim(),
      });

      setSummaries(prevSummaries => ({
        ...prevSummaries,
        [selectedTr.subjectId._id]: [...(prevSummaries[selectedTr.subjectId._id] || []), newSummary]
      }));

      setNewSummaryTranscriptId('');
      setNewSummaryText('');
    } catch (err) {
      console.error('Error creating summary:', err);
      setError(err?.payload?.error || 'Failed to create summary');
    } finally {
      setCreatingSummary(false);
    }
  };

  if (loading) {
    return <div className="page"><p>Loading...</p></div>;
  }

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 className="card__title">Learning Materials</h1>
      <p className="card__subtitle">Access your transcripts and summaries</p>

      {error && (
        <Alert variant="destructive" style={{ marginBottom: '1rem' }}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('transcripts')}
          style={{
            padding: '1rem 1.5rem',
            borderBottom: activeTab === 'transcripts' ? '3px solid #3b82f6' : 'none',
            color: activeTab === 'transcripts' ? '#3b82f6' : '#6b7280',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          Transcripts
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          style={{
            padding: '1rem 1.5rem',
            borderBottom: activeTab === 'modules' ? '3px solid #3b82f6' : 'none',
            color: activeTab === 'modules' ? '#3b82f6' : '#6b7280',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          Modules & Summaries
        </button>
      </div>

      {/* TRANSCRIPTS TAB */}
      {activeTab === 'transcripts' && (
        <>
          {transcripts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <FileText style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem', color: '#d1d5db' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No transcripts yet</h3>
              <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                Start transcribing your first lecture to see it here
              </p>
              <Button className="btn btn--primary" onClick={() => window.location.href = '/transcribe'}>
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
                    {transcript.lectureId?.name || 'Untitled'}
                  </h3>

                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar style={{ width: '1rem', height: '1rem' }} />
                      {new Date(transcript.studyDate).toLocaleDateString()}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {transcript.text.substring(0, 100)}...
                  </p>

                  <Button
                    onClick={() => viewTranscript(transcript)}
                    className="btn btn--ghost"
                    style={{ width: '100%' }}
                  >
                    <Eye style={{ width: '1rem', height: '1rem' }} />
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* MODULES TAB */}
      {activeTab === 'modules' && (
        <>
          {/* Create Summary */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>Create New Summary</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <Label className="form-label">Select Transcript *</Label>
                <select
                  value={newSummaryTranscriptId}
                  onChange={(e) => setNewSummaryTranscriptId(e.target.value)}
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
                      {transcript.lectureId?.name} - {new Date(transcript.studyDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="form-label">Summary Text *</Label>
                <textarea
                  placeholder="Enter your summary..."
                  value={newSummaryText}
                  onChange={(e) => setNewSummaryText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                    fontFamily: 'sans-serif',
                    minHeight: '150px'
                  }}
                />
              </div>
              <Button
                onClick={handleCreateSummary}
                disabled={creatingSummary}
                className="btn btn--primary"
                style={{ alignSelf: 'flex-start' }}
              >
                <Plus style={{ width: '1rem', height: '1rem' }} />
                {creatingSummary ? 'Creating...' : 'Create Summary'}
              </Button>
            </div>
          </div>

          {/* Display Modules/Summaries by Subject */}
          {subjects.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No subjects yet</h3>
              <p style={{ color: '#9ca3af' }}>Create a subject to add summaries</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '2rem' }}>
              {subjects.map(subject => {
                const subjectSummaries = summaries[subject._id] || [];
                return (
                  <div key={subject._id} className="card">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                      {subject.name}
                    </h2>

                    {subjectSummaries.length === 0 ? (
                      <p style={{ color: '#9ca3af' }}>No summaries for this subject yet</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        {subjectSummaries.map(summary => (
                          <div
                            key={summary._id}
                            style={{
                              padding: '1rem',
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.75rem',
                              background: '#f9fafb'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                                {summary.lectureId?.name}
                              </h4>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {editingSummaryId === summary._id ? (
                                  <>
                                    <Button
                                      onClick={() => handleSaveSummary(summary._id, subject._id)}
                                      size="sm"
                                      className="btn btn--primary"
                                    >
                                      <Save style={{ width: '1rem', height: '1rem' }} />
                                    </Button>
                                    <Button
                                      onClick={() => setEditingSummaryId(null)}
                                      size="sm"
                                      className="btn btn--ghost"
                                    >
                                      <X style={{ width: '1rem', height: '1rem' }} />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      onClick={() => handleEditSummary(summary._id, summary.text)}
                                      size="sm"
                                      className="btn btn--ghost"
                                    >
                                      <Edit2 style={{ width: '1rem', height: '1rem' }} />
                                    </Button>
                                    <Button
                                      onClick={() => handleDeleteSummary(summary._id, subject._id)}
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

                            {editingSummaryId === summary._id ? (
                              <textarea
                                value={editingSummaryText}
                                onChange={(e) => setEditingSummaryText(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.75rem',
                                  borderRadius: '0.5rem',
                                  border: '2px solid #3b82f6',
                                  fontSize: '0.95rem',
                                  fontFamily: 'sans-serif',
                                  minHeight: '120px'
                                }}
                              />
                            ) : (
                              <p style={{ margin: 0, color: '#4b5563', lineHeight: '1.6' }}>
                                {summary.text}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      )}

      {/* View Transcript Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent style={{ maxWidth: '900px', maxHeight: '80vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle>{selectedTranscript?.lectureId?.name}</DialogTitle>
            <DialogDescription>
              {selectedTranscript && new Date(selectedTranscript.studyDate).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          {selectedTranscript && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #e5e7eb', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {selectedTranscript.text}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transcripts;
