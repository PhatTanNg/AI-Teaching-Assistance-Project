import { useReactFlow } from '@xyflow/react';
import { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { ZoomIn, ZoomOut, Maximize2, Download, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function MindMapControls({ canvasRef }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { t } = useLanguage();
  const [exportOpen, setExportOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  async function getDataUrl() {
    const el = canvasRef?.current;
    if (!el) throw new Error('Canvas not found');
    return toPng(el, { backgroundColor: 'var(--bg-primary)', pixelRatio: 2 });
  }

  async function handleExportPng() {
    try {
      setExportOpen(false);
      const dataUrl = await getDataUrl();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'mindmap.png';
      a.click();
    } catch (err) {
      console.error('[MindMap] PNG export failed:', err);
    }
  }

  async function handleExportPdf() {
    try {
      setExportOpen(false);
      const dataUrl = await getDataUrl();
      const img = new Image();
      img.src = dataUrl;
      await new Promise((r) => { img.onload = r; });

      const pdf = new jsPDF({ orientation: img.width > img.height ? 'l' : 'p', unit: 'px', format: [img.width, img.height] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
      pdf.save('mindmap.pdf');
    } catch (err) {
      console.error('[MindMap] PDF export failed:', err);
    }
  }

  return (
    <div className="mindmap-controls">
      <button
        className="mindmap-controls__btn"
        onClick={() => zoomIn({ duration: 200 })}
        title="Zoom in"
        type="button"
      >
        <ZoomIn size={14} />
      </button>

      <button
        className="mindmap-controls__btn"
        onClick={() => zoomOut({ duration: 200 })}
        title="Zoom out"
        type="button"
      >
        <ZoomOut size={14} />
      </button>

      <button
        className="mindmap-controls__btn"
        onClick={() => fitView({ padding: 0.15, duration: 400 })}
        title="Fit to screen"
        type="button"
      >
        <Maximize2 size={14} />
      </button>

      <div className="mindmap-controls__divider" />

      {/* Export dropdown */}
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button
          className="mindmap-controls__btn"
          onClick={() => setExportOpen((o) => !o)}
          title="Export"
          type="button"
          style={{ width: 'auto', padding: '0 0.4rem', gap: '0.2rem', display: 'flex', alignItems: 'center' }}
        >
          <Download size={13} />
          <ChevronDown size={11} />
        </button>

        {exportOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--card-border)',
              borderRadius: '0.75rem',
              padding: '0.375rem',
              minWidth: '140px',
              zIndex: 100,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <button
              onClick={handleExportPng}
              type="button"
              style={{
                display: 'block',
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(110,231,247,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {t('mindmap.exportPng')}
            </button>
            <button
              onClick={handleExportPdf}
              type="button"
              style={{
                display: 'block',
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(110,231,247,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {t('mindmap.exportPdf')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
