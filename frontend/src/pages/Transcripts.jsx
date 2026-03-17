import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, Calendar, Eye, Edit2, Save, X, BookOpen, AlignLeft, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  getTranscripts,
  deleteTranscript,
  updateTranscriptText,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useChatContext } from '../context/ChatContext';

const Transcripts = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { setLectureContext } = useChatContext();

  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingField, setEditingField] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('transcript');

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
    setLectureContext({ transcript: tr.rawTranscript, summary: tr.summary, topic: tr.subject });
  }, [setLectureContext]);

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
        <p className="card__subtitle">{t('transcripts.subtitle')}</p>
      </div>

      {error && (
        <Alert variant="destructive" style={{ marginBottom: '1rem' }}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {transcripts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
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

              <div className="transcript-card__date">
                <Calendar size={11} />
                {new Date(tr.transcribedAt).toLocaleDateString()}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', flex: 1, lineHeight: 1.5 }}>
                {tr.rawTranscript?.substring(0, 120)}…
              </p>

              {tr.summary && (
                <div className="transcript-card__summary-badge">{t('transcripts.summaryBadge')}</div>
              )}

              <Button onClick={() => viewTranscript(tr)} className="btn btn--ghost" style={{ width: '100%' }}>
                <Eye size={16} /> {t('transcripts.viewBtn')}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Transcript Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) { setLectureContext(null); cancelEdit(); }
      }}>
        <DialogContent className="transcript-dialog">
          {selectedTranscript ? (
            <>
              <DialogHeader style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '0.75rem', flexShrink: 0,
                    background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-primary)'
                  }}>
                    <BookOpen size={20} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <DialogTitle style={{ color: 'var(--text-primary)', fontSize: '1.05rem', lineHeight: 1.3 }}>
                      {selectedTranscript.subject || 'Transcript'}
                    </DialogTitle>
                    <DialogDescription style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} />
                      {selectedTranscript.transcribedAt
                        ? new Date(selectedTranscript.transcribedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : ''}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs
                value={activeTab}
                onValueChange={(v) => { setActiveTab(v); cancelEdit(); }}
                style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
              >
                {/* Tab row + contextual edit button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <TabsList style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '0.75rem',
                    padding: '0.25rem',
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.25rem',
                  }}>
                    <TabsTrigger value="transcript">
                      <AlignLeft size={13} /> {t('transcripts.transcriptLabel')}
                    </TabsTrigger>
                    <TabsTrigger value="summary">
                      <Sparkles size={13} />
                      {t('transcripts.summaryLabel')}
                      {!selectedTranscript.summary && (
                        <span style={{
                          fontSize: '0.65rem', background: 'rgba(252,211,77,0.2)',
                          color: 'var(--accent-yellow)', padding: '1px 5px', borderRadius: '999px',
                          marginLeft: '0.25rem',
                        }}>...</span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  {activeTab === 'transcript' && editingField !== 'rawTranscript' && (
                    <Button
                      onClick={() => startEdit('rawTranscript', selectedTranscript.rawTranscript)}
                      size="sm" className="btn btn--ghost btn--sm"
                      style={{ flexShrink: 0 }}
                    >
                      <Edit2 size={13} /> {t('transcripts.editTranscript')}
                    </Button>
                  )}
                  {activeTab === 'summary' && selectedTranscript.summary && editingField !== 'summary' && (
                    <Button
                      onClick={() => startEdit('summary', selectedTranscript.summary)}
                      size="sm" className="btn btn--ghost btn--sm"
                      style={{ flexShrink: 0 }}
                    >
                      <Edit2 size={13} /> {t('transcripts.editSummary')}
                    </Button>
                  )}
                </div>

                {/* Transcript tab */}
                <TabsContent value="transcript" style={{ marginTop: '0.75rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {editingField === 'rawTranscript' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <textarea
                        className="neon-textarea"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        style={{ minHeight: '200px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                      />
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
                    <div className="transcript-dialog__text-box">
                      {selectedTranscript.rawTranscript}
                    </div>
                  )}
                </TabsContent>

                {/* Summary tab */}
                <TabsContent value="summary" style={{ marginTop: '0.75rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {editingField === 'summary' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <textarea
                        className="neon-textarea"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        style={{ minHeight: '180px' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Button onClick={handleSaveEdit} disabled={isSaving} className="btn btn--sm">
                          <Save size={14} /> {isSaving ? t('common.loading') : t('transcripts.saveEdit')}
                        </Button>
                        <Button onClick={cancelEdit} className="btn btn--ghost btn--sm">
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                  ) : selectedTranscript.summary ? (
                    <div className="transcript-dialog__summary-box">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {selectedTranscript.summary}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="transcript-dialog__generating">
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
                      <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                        {t('transcripts.summaryGenerating')}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {t('transcripts.summaryGeneratingDesc')}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {t('transcripts.noTranscriptSelected')}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transcripts;
