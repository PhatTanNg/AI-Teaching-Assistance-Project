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
import { useLanguage } from '../context/LanguageContext';

const Transcripts = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingField, setEditingField] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
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
    loadData();
  }, [token]);

  const handleDelete = async (id, idx) => {
    if (!confirm(t('transcripts.deleteConfirm'))) return;
    try {
      await deleteTranscript(token, id);
      setTranscripts((prev) => prev.filter((_, i) => i !== idx));
    } catch {
      setError(t('transcripts.deleteFailed'));
    }
  };

  const viewTranscript = useCallback((tr) => {
    if (!tr?._id) { setError('Invalid transcript'); return; }
    setSelectedTranscript(tr);
    setIsDialogOpen(true);
  }, []);

  const startEdit = (field, text) => { setEditingField(field); setEditingText(text); };
  const cancelEdit = () => { setEditingField(null); setEditingText(''); };

  const handleSaveEdit = async () => {
    if (!editingText.trim()) { setError('Text cannot be empty'); return; }
    if (!selectedTranscript || !token) return;
    try {
      setIsSaving(true);
      const data = editingField === 'rawTranscript'
        ? { rawTranscript: editingText.trim() }
        : { summary: editingText.trim() };
      const updated = await updateTranscriptText(token, selectedTranscript._id, data);
      setSelectedTranscript(updated);
      setTranscripts((prev) => prev.map((tr) => (tr._id === updated._id ? updated : tr)));
      cancelEdit();
    } catch {
      setError('Failed to update transcript');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-state">
        <div className="spinner" />
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="page" style={{ width: '100%', maxWidth: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>{t('transcripts.title')}</h1>
        <p className="card__subtitle">Access your transcripts and auto-generated summaries</p>
      </div>

      {error && (
        <Alert variant="destructive" style={{ marginBottom: '1rem' }}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {transcripts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            {/* Inline SVG illustration */}
            <svg className="empty-state__art" width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden="true">
              <rect x="20" y="20" width="80" height="60" rx="8" fill="rgba(110,231,247,0.08)" stroke="rgba(110,231,247,0.2)" strokeWidth="1.5"/>
              <rect x="32" y="34" width="40" height="4" rx="2" fill="rgba(110,231,247,0.3)"/>
              <rect x="32" y="44" width="56" height="4" rx="2" fill="rgba(110,231,247,0.2)"/>
              <rect x="32" y="54" width="48" height="4" rx="2" fill="rgba(110,231,247,0.15)"/>
              <circle cx="90" cy="70" r="14" fill="rgba(167,139,250,0.1)" stroke="rgba(167,139,250,0.25)" strokeWidth="1.5"/>
              <path d="M86 70 L89 73 L94 67" stroke="rgba(167,139,250,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="empty-state__title">{t('transcripts.emptyTitle')}</div>
            <p className="empty-state__desc">{t('transcripts.emptyDesc')}</p>
            <Button className="btn" onClick={() => navigate('/transcribe')}>
              {t('transcripts.goRecord')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="transcripts-grid stagger">
          {transcripts.map((tr, idx) => (
            <div key={tr._id} className="transcript-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div className="transcript-card__icon">
                  <FileText size={20} />
                </div>
                <button
                  onClick={() => handleDelete(tr._id, idx)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
                  title="Delete transcript"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.3, color: 'var(--text-primary)' }}>
                {tr.subject || 'Untitled'}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                <Calendar size={14} />
                {new Date(tr.transcribedAt).toLocaleDateString()}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', flex: 1, lineHeight: 1.5 }}>
                {tr.rawTranscript?.substring(0, 120)}…
              </p>

              {tr.summary && (
                <div className="transcript-card__summary-badge">✓ Summary available</div>
              )}

              <Button onClick={() => viewTranscript(tr)} className="btn btn--ghost" style={{ width: '100%' }}>
                <Eye size={16} /> {t('transcripts.viewBtn')}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent style={{
          maxWidth: '900px', maxHeight: '80vh', overflowY: 'auto',
          position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 9999, backgroundColor: 'var(--bg-secondary)',
          borderRadius: '1rem', border: '1px solid var(--glass-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)', padding: '1.5rem', color: 'var(--text-primary)'
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-primary)' }}>
              {selectedTranscript?.subject || 'Transcript'}
            </DialogTitle>
            <DialogDescription style={{ color: 'var(--text-secondary)' }}>
              {selectedTranscript?.transcribedAt
                ? new Date(selectedTranscript.transcribedAt).toLocaleDateString()
                : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedTranscript ? (
            <div style={{ marginTop: '1rem', display: 'grid', gap: '1.5rem' }}>
              {/* Transcript Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: 'var(--text-primary)' }}>{t('transcripts.transcriptLabel')}</h4>
                  {editingField !== 'rawTranscript' && (
                    <Button onClick={() => startEdit('rawTranscript', selectedTranscript.rawTranscript)}
                      size="sm" className="btn btn--ghost btn--sm">
                      <Edit2 size={14} />
                    </Button>
                  )}
                </div>
                {editingField === 'rawTranscript' ? (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <textarea className="neon-textarea" value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      style={{ minHeight: '200px', fontFamily: 'var(--font-mono)' }} />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Button onClick={handleSaveEdit} disabled={isSaving} className="btn btn--sm">
                        <Save size={14} /> {isSaving ? t('common.loading') : t('transcripts.saveEdit')}
                      </Button>
                      <Button onClick={cancelEdit} className="btn btn--ghost btn--sm">
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '0.75rem',
                    border: '1px solid var(--glass-border)', whiteSpace: 'pre-wrap', lineHeight: 1.6,
                    fontSize: '0.9rem', color: 'var(--text-secondary)', maxHeight: '300px', overflowY: 'auto' }}>
                    {selectedTranscript.rawTranscript}
                  </div>
                )}
              </div>

              {/* Summary Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: 'var(--text-primary)' }}>
                    {t('transcripts.summaryLabel')} {!selectedTranscript.summary && (
                      <span className="tag tag--yellow" style={{ marginLeft: '0.5rem' }}>Generating…</span>
                    )}
                  </h4>
                  {selectedTranscript.summary && editingField !== 'summary' && (
                    <Button onClick={() => startEdit('summary', selectedTranscript.summary)}
                      size="sm" className="btn btn--ghost btn--sm">
                      <Edit2 size={14} />
                    </Button>
                  )}
                </div>
                {editingField === 'summary' ? (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    <textarea className="neon-textarea" value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      style={{ minHeight: '150px' }} />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Button onClick={handleSaveEdit} disabled={isSaving} className="btn btn--sm">
                        <Save size={14} /> {isSaving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button onClick={cancelEdit} className="btn btn--ghost btn--sm">
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                ) : selectedTranscript.summary ? (
                  <div style={{ padding: '1rem', background: 'rgba(74,222,128,0.06)', borderRadius: '0.75rem',
                    border: '1px solid rgba(74,222,128,0.15)', lineHeight: 1.6, fontSize: '0.9rem',
                    color: 'var(--text-secondary)' }}>
                    {selectedTranscript.summary}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: 'rgba(252,211,77,0.06)', borderRadius: '0.75rem',
                    border: '1px solid rgba(252,211,77,0.15)', color: 'var(--accent-yellow)', fontSize: '0.85rem' }}>
                    Summary is being auto-generated. Refresh the page to see it when ready.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No transcript selected.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transcripts;
