import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { getMindMaps, getMindMap } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import MindMapLibrary from '../components/mindmap/MindMapLibrary.jsx';
import MindMapCanvas from '../components/mindmap/MindMapCanvas.jsx';
import NodeDetailPanel from '../components/mindmap/NodeDetailPanel.jsx';
import CreateMindMapModal from '../components/mindmap/CreateMindMapModal.jsx';

const LOADING_STEPS = ['loadingStep1', 'loadingStep2', 'loadingStep3'];

export default function MindMapPage() {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [maps, setMaps] = useState([]);
  const [selectedMeta, setSelectedMeta] = useState(null); // metadata (no mapData)
  const [activeMap, setActiveMap] = useState(null);       // full map with mapData
  const [selectedNode, setSelectedNode] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);

  // Cycle loading step text while generating
  const stepTimerRef = useRef(null);
  useEffect(() => {
    if (isGenerating) {
      setLoadingStep(0);
      stepTimerRef.current = setInterval(() => {
        setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
      }, 4000);
    } else {
      clearInterval(stepTimerRef.current);
    }
    return () => clearInterval(stepTimerRef.current);
  }, [isGenerating]);

  // Load mind map list on mount
  useEffect(() => {
    if (!token) return;
    getMindMaps(token)
      .then((data) => setMaps(Array.isArray(data) ? data : []))
      .catch(() => toast.error(t('common.error')));
  }, [token, t]);

  // When user selects a map from the library, fetch its full data (with mapData)
  async function handleSelect(meta) {
    if (!meta) {
      setSelectedMeta(null);
      setActiveMap(null);
      setSelectedNode(null);
      return;
    }
    if (meta._id === selectedMeta?._id && activeMap) return; // already loaded
    setSelectedMeta(meta);
    setSelectedNode(null);
    setError(null);
    try {
      const full = await getMindMap(token, meta._id);
      setActiveMap(full);
    } catch {
      setError(t('mindmap.errorDesc'));
      toast.error(t('mindmap.errorDesc'));
    }
  }

  // Called by CreateMindMapModal when generation is done and saved
  function handleCreated(newMap) {
    // Add to top of list
    setMaps((prev) => {
      const withoutDup = prev.filter((m) => m._id !== newMap._id);
      return [newMap, ...withoutDup];
    });
    setSelectedMeta(newMap);
    setActiveMap(newMap);
    setSelectedNode(null);
    setError(null);
  }

  // Called by library for rename/delete updates
  function handleMapsChange(updater) {
    setMaps(updater);
  }

  // Retry error
  function handleRetry() {
    if (selectedMeta) handleSelect(selectedMeta);
  }

  const loadingText = t(`mindmap.${LOADING_STEPS[loadingStep]}`);

  return (
    <div className="mindmap-layout">
      {/* ── Left panel: library ── */}
      <MindMapLibrary
        maps={maps}
        selectedId={selectedMeta?._id}
        onSelect={handleSelect}
        onCreateClick={() => setIsCreateOpen(true)}
        onMapsChange={handleMapsChange}
      />

      {/* ── Right panel: canvas ── */}
      <div className="mindmap-canvas-area">
        {/* Mobile-only top bar — replaces hidden library */}
        <div className="mindmap-mobile-bar">
          <select
            className="mindmap-mobile-bar__select"
            value={selectedMeta?._id ?? ''}
            onChange={(e) => {
              const found = maps.find((m) => m._id === e.target.value);
              if (found) handleSelect(found);
            }}
            aria-label={t('mindmap.selectMap')}
          >
            <option value="" disabled>{maps.length === 0 ? t('mindmap.emptyDesc') : t('mindmap.noMapSelected')}</option>
            {maps.map((m) => (
              <option key={m._id} value={m._id}>{m.title}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setIsCreateOpen(true)}
            aria-label={t('mindmap.createBtn')}
            style={{ flexShrink: 0, padding: '0.4rem 0.6rem', minHeight: '36px' }}
          >
            <Plus size={16} />
          </button>
        </div>
        {isGenerating ? (
          <div className="mindmap-gen-loader">
            <div className="mindmap-gen-loader__spinner" />
            <p className="mindmap-gen-loader__text">{loadingText}</p>
          </div>
        ) : error ? (
          <div className="mindmap-empty-canvas">
            <p style={{ fontSize: '2rem' }}>😔</p>
            <p style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{t('mindmap.errorTitle')}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{error}</p>
            <button type="button" className="btn btn--sm" onClick={handleRetry} style={{ marginTop: '0.5rem' }}>
              {t('mindmap.retry')}
            </button>
          </div>
        ) : !activeMap ? (
          <div className="mindmap-empty-canvas">
            <div className="mindmap-empty-canvas__icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="20" r="8" stroke="var(--text-muted)" strokeWidth="2" fill="none"/>
                <circle cx="16" cy="60" r="8" stroke="var(--text-muted)" strokeWidth="2" fill="none"/>
                <circle cx="64" cy="60" r="8" stroke="var(--text-muted)" strokeWidth="2" fill="none"/>
                <line x1="40" y1="28" x2="16" y2="52" stroke="var(--text-muted)" strokeWidth="2"/>
                <line x1="40" y1="28" x2="64" y2="52" stroke="var(--text-muted)" strokeWidth="2"/>
              </svg>
            </div>
            <p className="mindmap-empty-canvas__text">
              {maps.length === 0 ? t('mindmap.emptyDesc') : t('mindmap.noMapSelected')}
            </p>
            {maps.length === 0 && (
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setIsCreateOpen(true)}
                style={{ marginTop: '0.5rem' }}
              >
                {t('mindmap.createBtn')}
              </button>
            )}
          </div>
        ) : (
          <>
            <MindMapCanvas
              mapData={activeMap.mapData}
              onNodeSelect={setSelectedNode}
            />
            <NodeDetailPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          </>
        )}
      </div>

      {/* Create mind map modal */}
      <CreateMindMapModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
