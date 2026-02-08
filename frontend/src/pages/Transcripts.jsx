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
                      onClick={() => handleDeleteTranscript(transcript._id, index)}\n                      style={{
                        background: 'transparent',
                        border: 'none',\n                        cursor: 'pointer',
                        color: '#9ca3af'\n                      }}\n                    >\n                      <Trash2 style={{ width: '1rem', height: '1rem' }} />\n                    </button>\n                  </div>\n\n                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', lineHeight: '1.3' }}>\n                    {transcript.lectureId?.name || 'Untitled'}\n                  </h3>\n\n                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem', display: 'grid', gap: '0.5rem' }}>\n                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>\n                      <Calendar style={{ width: '1rem', height: '1rem' }} />\n                      {new Date(transcript.studyDate).toLocaleDateString()}\n                    </div>\n                  </div>\n\n                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>\n                    {transcript.text.substring(0, 100)}...\n                  </p>\n\n                  <Button\n                    onClick={() => viewTranscript(transcript)}\n                    className=\"btn btn--ghost\"\n                    style={{ width: '100%' }}\n                  >\n                    <Eye style={{ width: '1rem', height: '1rem' }} />\n                    View\n                  </Button>\n                </div>\n              ))}\n            </div>\n          )}\n        </>\n      )}\n\n      {/* MODULES TAB */}\n      {activeTab === 'modules' && (\n        <>\n          {/* Create Summary */}\n          <div className=\"card\" style={{ marginBottom: '2rem' }}>\n            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>Create New Summary</h3>\n            <div style={{ display: 'grid', gap: '1rem' }}>\n              <div>\n                <Label className=\"form-label\">Select Transcript *</Label>\n                <select\n                  value={newSummaryTranscriptId}\n                  onChange={(e) => setNewSummaryTranscriptId(e.target.value)}\n                  style={{\n                    width: '100%',\n                    padding: '0.75rem',\n                    borderRadius: '0.5rem',\n                    border: '1px solid #ccc',\n                    fontSize: '1rem'\n                  }}\n                >\n                  <option value=\"\">-- Select a transcript --</option>\n                  {transcripts.map(transcript => (\n                    <option key={transcript._id} value={transcript._id}>\n                      {transcript.lectureId?.name} - {new Date(transcript.studyDate).toLocaleDateString()}\n                    </option>\n                  ))}\n                </select>\n              </div>\n              <div>\n                <Label className=\"form-label\">Summary Text *</Label>\n                <textarea\n                  placeholder=\"Enter your summary...\"\n                  value={newSummaryText}\n                  onChange={(e) => setNewSummaryText(e.target.value)}\n                  style={{\n                    width: '100%',\n                    padding: '0.75rem',\n                    borderRadius: '0.5rem',\n                    border: '1px solid #ccc',\n                    fontSize: '1rem',\n                    fontFamily: 'sans-serif',\n                    minHeight: '150px'\n                  }}\n                />\n              </div>\n              <Button\n                onClick={handleCreateSummary}\n                disabled={creatingSummary}\n                className=\"btn btn--primary\"\n                style={{ alignSelf: 'flex-start' }}\n              >\n                <Plus style={{ width: '1rem', height: '1rem' }} />\n                {creatingSummary ? 'Creating...' : 'Create Summary'}\n              </Button>\n            </div>\n          </div>\n\n          {/* Display Modules/Summaries by Subject */}\n          {subjects.length === 0 ? (\n            <div className=\"card\" style={{ textAlign: 'center', padding: '3rem' }}>\n              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>No subjects yet</h3>\n              <p style={{ color: '#9ca3af' }}>Create a subject to add summaries</p>\n            </div>\n          ) : (\n            <div style={{ display: 'grid', gap: '2rem' }}>\n              {subjects.map(subject => {\n                const subjectSummaries = summaries[subject._id] || [];\n                return (\n                  <div key={subject._id} className=\"card\">\n                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>\n                      {subject.name}\n                    </h2>\n\n                    {subjectSummaries.length === 0 ? (\n                      <p style={{ color: '#9ca3af' }}>No summaries for this subject yet</p>\n                    ) : (\n                      <div style={{ display: 'grid', gap: '1rem' }}>\n                        {subjectSummaries.map(summary => (\n                          <div\n                            key={summary._id}\n                            style={{\n                              padding: '1rem',\n                              border: '1px solid #e5e7eb',\n                              borderRadius: '0.75rem',\n                              background: '#f9fafb'\n                            }}\n                          >\n                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>\n                              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>\n                                {summary.lectureId?.name}\n                              </h4>\n                              <div style={{ display: 'flex', gap: '0.5rem' }}>\n                                {editingSummaryId === summary._id ? (\n                                  <>\n                                    <Button\n                                      onClick={() => handleSaveSummary(summary._id, subject._id)}\n                                      size=\"sm\"\n                                      className=\"btn btn--primary\"\n                                    >\n                                      <Save style={{ width: '1rem', height: '1rem' }} />\n                                    </Button>\n                                    <Button\n                                      onClick={() => setEditingSummaryId(null)}\n                                      size=\"sm\"\n                                      className=\"btn btn--ghost\"\n                                    >\n                                      <X style={{ width: '1rem', height: '1rem' }} />\n                                    </Button>\n                                  </>\n                                ) : (\n                                  <>\n                                    <Button\n                                      onClick={() => handleEditSummary(summary._id, summary.text)}\n                                      size=\"sm\"\n                                      className=\"btn btn--ghost\"\n                                    >\n                                      <Edit2 style={{ width: '1rem', height: '1rem' }} />\n                                    </Button>\n                                    <Button\n                                      onClick={() => handleDeleteSummary(summary._id, subject._id)}\n                                      size=\"sm\"\n                                      className=\"btn btn--ghost\"\n                                      style={{ color: '#dc2626' }}\n                                    >\n                                      <Trash2 style={{ width: '1rem', height: '1rem' }} />\n                                    </Button>\n                                  </>\n                                )}\n                              </div>\n                            </div>\n\n                            {editingSummaryId === summary._id ? (\n                              <textarea\n                                value={editingSummaryText}\n                                onChange={(e) => setEditingSummaryText(e.target.value)}\n                                style={{\n                                  width: '100%',\n                                  padding: '0.75rem',\n                                  borderRadius: '0.5rem',\n                                  border: '2px solid #3b82f6',\n                                  fontSize: '0.95rem',\n                                  fontFamily: 'sans-serif',\n                                  minHeight: '120px'\n                                }}\n                              />\n                            ) : (\n                              <p style={{ margin: 0, color: '#4b5563', lineHeight: '1.6' }}>\n                                {summary.text}\n                              </p>\n                            )}\n                          </div>\n                        ))}\n                      </div>\n                    )}\n                  </div>\n                );\n              })}\n            </div>\n          )}\n        </>\n      )}
};
        </>
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
