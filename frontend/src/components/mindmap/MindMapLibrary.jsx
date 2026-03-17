import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../ui/alert-dialog.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu.tsx';
import { renameMindMap, deleteMindMap, regenerateMindMap } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function MindMapLibrary({ maps, selectedId, onSelect, onCreateClick, onMapsChange, onExport }) {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);

  const [deleteId, setDeleteId] = useState(null);
  const [regenerateId, setRegenerateId] = useState(null);
  const [sourcesMap, setSourcesMap] = useState(null); // { title, transcriptIds }

  // Focus rename input when it appears
  useEffect(() => {
    if (renameId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renameId]);

  async function handleRenameSubmit(id) {
    const trimmed = renameValue.trim().slice(0, 80);
    if (!trimmed) { setRenameId(null); return; }
    try {
      const updated = await renameMindMap(token, id, trimmed);
      onMapsChange((prev) => prev.map((m) => m._id === id ? { ...m, title: updated.title } : m));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setRenameId(null);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMindMap(token, deleteId);
      onMapsChange((prev) => prev.filter((m) => m._id !== deleteId));
      toast.success('Đã xóa mind map');
      if (selectedId === deleteId) onSelect(null);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeleteId(null);
    }
  }

  async function handleRegenerate() {
    if (!regenerateId) return;
    try {
      toast.loading(t('mindmap.saving'), { id: 'regen' });
      const result = await regenerateMindMap(token, regenerateId);
      toast.success(t('mindmap.saved'), { id: 'regen' });
      onMapsChange((prev) => prev.map((m) => m._id === regenerateId ? { ...m, isStale: false } : m));
      // If this is the selected map, update the view
      if (selectedId === regenerateId) onSelect(result);
    } catch {
      toast.error(t('common.error'), { id: 'regen' });
    } finally {
      setRegenerateId(null);
    }
  }

  const formattedDate = (ts) =>
    ts ? new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

  return (
    <>
      <div className="mindmap-library">
        {/* Header */}
        <div className="mindmap-library__header">
          <span className="mindmap-library__title">{t('mindmap.title')}</span>
        </div>

        {/* Empty state */}
        {maps.length === 0 && (
          <div className="empty-state" style={{ padding: '2rem 0.5rem', flex: 1 }}>
            <div className="empty-state__art">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="12" r="5" stroke="var(--text-muted)" strokeWidth="1.5" fill="none"/>
                <circle cx="10" cy="36" r="5" stroke="var(--text-muted)" strokeWidth="1.5" fill="none"/>
                <circle cx="38" cy="36" r="5" stroke="var(--text-muted)" strokeWidth="1.5" fill="none"/>
                <line x1="24" y1="17" x2="10" y2="31" stroke="var(--text-muted)" strokeWidth="1.5"/>
                <line x1="24" y1="17" x2="38" y2="31" stroke="var(--text-muted)" strokeWidth="1.5"/>
              </svg>
            </div>
            <p className="empty-state__title" style={{ fontSize: '0.85rem' }}>{t('mindmap.emptyTitle')}</p>
            <p className="empty-state__desc" style={{ fontSize: '0.78rem' }}>{t('mindmap.emptyDesc')}</p>
          </div>
        )}

        {/* Map list */}
        {maps.map((map) => (
          <div
            key={map._id}
            className={`mindmap-library__item${selectedId === map._id ? ' mindmap-library__item--active' : ''}`}
            onClick={() => onSelect(map)}
          >
            {/* Title (editable inline) */}
            {renameId === map._id ? (
              <input
                ref={renameInputRef}
                className="form-input"
                style={{ fontSize: '0.82rem', padding: '0.3rem 0.5rem', marginBottom: '0.25rem' }}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit(map._id);
                  if (e.key === 'Escape') setRenameId(null);
                }}
                onBlur={() => handleRenameSubmit(map._id)}
                onClick={(e) => e.stopPropagation()}
                maxLength={80}
              />
            ) : (
              <div className="mindmap-library__item-title">{map.title}</div>
            )}

            {/* Meta */}
            <div className="mindmap-library__item-meta">
              <span>{t('mindmap.transcriptCount').replace('{n}', map.transcriptIds?.length ?? 0)}</span>
              <span>·</span>
              <span>{formattedDate(map.updatedAt)}</span>
              {map.isStale && (
                <span className="mindmap-stale-badge">
                  <AlertTriangle size={9} /> {t('mindmap.stale')}
                </span>
              )}
            </div>

            {/* ⋯ menu */}
            <div className="mindmap-library__item-menu" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="mindmap-controls__btn"
                    style={{ width: 24, height: 24 }}
                    title="More options"
                  >
                    <MoreHorizontal size={13} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" style={{ minWidth: '160px' }}>
                  <DropdownMenuItem
                    onClick={() => {
                      setRenameId(map._id);
                      setRenameValue(map.title);
                    }}
                  >
                    {t('mindmap.rename')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSourcesMap({ title: map.title, transcriptIds: map.transcriptIds })}
                  >
                    {t('mindmap.viewSources')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setRegenerateId(map._id)}>
                    {t('mindmap.regenerate')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteId(map._id)}
                    style={{ color: 'var(--accent-red)' }}
                  >
                    {t('mindmap.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {/* Create button (sticky at bottom) */}
        <div className="mindmap-library__create-btn">
          <button type="button" className="btn btn--full btn--sm" onClick={onCreateClick}>
            {t('mindmap.createBtn')}
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('mindmap.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('mindmap.confirmDelete')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>{t('mindmap.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              style={{ background: 'var(--accent-red)', color: '#fff' }}
            >
              {t('mindmap.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate confirm */}
      <AlertDialog open={!!regenerateId} onOpenChange={(v) => { if (!v) setRegenerateId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('mindmap.regenerate')}</AlertDialogTitle>
            <AlertDialogDescription>{t('mindmap.confirmRegenerate')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRegenerateId(null)}>{t('mindmap.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerate}
              style={{ background: 'var(--accent-primary)', color: 'var(--bg-primary)' }}
            >
              {t('mindmap.regenerateBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Source transcripts dialog */}
      <Dialog open={!!sourcesMap} onOpenChange={(v) => { if (!v) setSourcesMap(null); }}>
        <DialogContent style={{ maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle>{t('mindmap.sourcesTitle')}</DialogTitle>
            <DialogDescription className="sr-only">{t('mindmap.sourcesTitle')}</DialogDescription>
          </DialogHeader>
          {sourcesMap && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {sourcesMap.transcriptIds.map((id, i) => (
                <div
                  key={String(id)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-elevated)',
                    borderRadius: '0.5rem',
                    fontSize: '0.83rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Transcript {i + 1}: <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{String(id)}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
