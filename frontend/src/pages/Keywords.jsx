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
  createKeywordGroup,
  updateKeywordDefinition,
  removeKeywordFromGroup,
  addKeywordToGroup,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Keywords = () => {
  const { token } = useAuth();
  const { t } = useLanguage();

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

  useEffect(() => {
    const loadKeywords = async () => {
      if (!selectedTranscript || !token) return;
      try {
        // Always try real keyword groups first
        const realGroups = await getKeywordGroupsByTranscript(token, selectedTranscript);
        if (realGroups.length > 0) {
          setKeywordGroups(realGroups);
          return;
        }
        // Fall back to legacy sessionId-based keywords (read-only)
        const transcriptObj = transcripts.find(t => t._id === selectedTranscript);
        if (transcriptObj?.sessionId) {
          const kws = await getKeywordsBySession(token, transcriptObj.sessionId);
          setKeywordGroups(kws.length > 0
            ? [{ _id: transcriptObj.sessionId, isLegacy: true, transcriptId: selectedTranscript, keywords: kws }]
            : []);
        } else {
          setKeywordGroups([]);
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
    if (!token || !editingDefinition.trim()) { setError(t('keywords.definitionEmpty')); return; }
    try {
      await updateKeywordDefinition(token, keywordId, { definition: editingDefinition.trim() });
      setKeywordGroups(prev => prev.map(g => ({
        ...g,
        keywords: g.keywords.map(kw => kw._id === keywordId ? { ...kw, definition: editingDefinition.trim() } : kw),
      })));
      setEditingKeywordId(null);
      setEditingDefinition('');
      setSuccessMessage('Definition updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating definition:', err);
      setError(err?.payload?.error || t('keywords.updateFailed'));
    }
  };

  const handleDeleteKeyword = async (keywordGroupId, keywordId) => {
    if (!confirm(t('keywords.deleteConfirm'))) return;
    if (!token) { setError(t('auth.notAuthenticated')); return; }
    setError('');
    try {
      await removeKeywordFromGroup(token, keywordGroupId, keywordId);
      setKeywordGroups(prev => prev.map(g => ({ ...g, keywords: g.keywords.filter(kw => kw._id !== keywordId) })));
      setSuccessMessage('Keyword deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting keyword:', err);
      setError(err?.payload?.error || t('keywords.deleteFailed'));
    }
  };

  const handleAddKeyword = async () => {
    setError('');
    if (!newKeywordText.trim() || !newKeywordDef.trim()) {
      setError(t('keywords.fillBoth'));
      return;
    }
    if (!token) { setError(t('auth.notAuthenticated')); return; }
    try {
      let targetGroup = keywordGroups.find(g => !g.isLegacy);
      if (!targetGroup) {
        // No real group yet — create one for this transcript on the fly
        targetGroup = await createKeywordGroup(token, {
          transcriptId: selectedTranscript,
          studyDate: new Date().toISOString(),
        });
        setKeywordGroups(prev => [...prev.filter(g => !g.isLegacy), targetGroup]);
      }
      const result = await addKeywordToGroup(token, targetGroup._id, {
        keywordText: newKeywordText.trim(),
        definition: newKeywordDef.trim(),
      });
      setKeywordGroups(prev => prev.map(g => g._id === targetGroup._id ? result : g));
      setNewKeywordText('');
      setNewKeywordDef('');
      setSuccessMessage('Keyword added successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error adding keyword:', err);
      setError(err?.payload?.error || 'Failed to add keyword');
    }
  };

  // Carry groupId on each keyword so the delete handler uses the correct group
  const allKeywords = keywordGroups.flatMap(g => g.keywords.map(kw => ({ ...kw, groupId: g._id, isLegacy: g.isLegacy })));
  const filteredKeywords = allKeywords.filter(kw =>
    kw.keywordText.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1>{t('keywords.title')}</h1>
        <p className="card__subtitle">{t('keywords.subtitle')}</p>
      </div>

      {error && (
        <Alert variant="destructive" style={{ marginBottom: '1rem' }}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert style={{ marginBottom: '1rem', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <AlertDescription style={{ color: 'var(--accent-green)' }}>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Transcript Selector */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <Label className="form-label">{t('keywords.selectTranscript')}</Label>
        <select
          value={selectedTranscript}
          onChange={(e) => setSelectedTranscript(e.target.value)}
          className="form-input"
          style={{ appearance: 'auto' }}
        >
          <option value="">-- {t('keywords.selectTranscript')} --</option>
          {transcripts.map(transcript => (
            <option key={transcript._id} value={transcript._id}>
              {transcript.subject} — {new Date(transcript.transcribedAt).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {selectedTranscript && (
        <>
          {/* Search */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: 'var(--text-muted)' }} />
              <Input placeholder={t('keywords.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input" style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>

          {/* Add New Keyword */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('keywords.addKeyword')}</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <Label className="form-label">{t('keywords.textLabel')}</Label>
                <Input placeholder={t('keywords.textPH')} value={newKeywordText} onChange={(e) => setNewKeywordText(e.target.value)}
                  className="form-input" />
              </div>
              <div>
                <Label className="form-label">{t('keywords.defLabel')}</Label>
                <textarea placeholder={t('keywords.defPH')} value={newKeywordDef} onChange={(e) => setNewKeywordDef(e.target.value)}
                  className="neon-textarea" style={{ minHeight: '100px' }} />
              </div>
              <Button onClick={handleAddKeyword} className="btn" style={{ alignSelf: 'flex-start' }}>
                <Plus size={16} /> {t('keywords.addKeyword')}
              </Button>
            </div>
          </div>

          {/* Keywords List */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Keywords ({filteredKeywords.length})
            </h3>

            {filteredKeywords.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <svg className="empty-state__art" width="100" height="90" viewBox="0 0 100 90" fill="none" aria-hidden="true">
                  <rect x="10" y="15" width="80" height="55" rx="8" fill="rgba(167,139,250,0.08)" stroke="rgba(167,139,250,0.2)" strokeWidth="1.5"/>
                  <rect x="22" y="28" width="20" height="6" rx="3" fill="rgba(167,139,250,0.35)"/>
                  <rect x="48" y="28" width="28" height="6" rx="3" fill="rgba(110,231,247,0.25)"/>
                  <rect x="22" y="40" width="36" height="6" rx="3" fill="rgba(167,139,250,0.2)"/>
                  <rect x="64" y="40" width="14" height="6" rx="3" fill="rgba(110,231,247,0.15)"/>
                  <rect x="22" y="52" width="26" height="6" rx="3" fill="rgba(167,139,250,0.15)"/>
                </svg>
                <div className="empty-state__title">
                  {searchTerm ? t('common.error') : t('keywords.emptyTitle')}
                </div>
                <p className="empty-state__desc">
                  {searchTerm ? t('keywords.tryDifferentSearch') : t('keywords.emptyDesc')}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {filteredKeywords.map(keyword => (
                  <div key={keyword._id} className="keyword-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{keyword.keywordText}</h4>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {editingKeywordId === keyword._id ? (
                          <>
                            <Button onClick={() => handleSaveDefinition(keyword._id)} size="sm" className="btn btn--sm">
                              <Save size={14} />
                            </Button>
                            <Button onClick={() => setEditingKeywordId(null)} size="sm" className="btn btn--ghost btn--sm">
                              <X size={14} />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => handleEditDefinition(keyword._id, keyword.definition)} size="sm" className="btn btn--ghost btn--sm">
                              <Edit2 size={14} />
                            </Button>
                            <Button onClick={() => handleDeleteKeyword(keyword.groupId, keyword._id)} size="sm"
                              className="btn btn--ghost btn--sm" style={{ color: 'var(--accent-red)' }} disabled={keyword.isLegacy}>
                              <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingKeywordId === keyword._id ? (
                      <textarea value={editingDefinition} onChange={(e) => setEditingDefinition(e.target.value)}
                        className="neon-textarea" style={{ minHeight: '80px' }} />
                    ) : (
                      <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
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
