import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function NodeDetailPanel({ node, onClose }) {
  const { t } = useLanguage();

  if (!node) return null;

  return (
    <div className="mindmap-detail-panel">
      <div className="mindmap-detail-panel__header">
        <div className="mindmap-detail-panel__title">
          📌 {node.label}
        </div>
        <button
          className="mindmap-detail-panel__close"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mindmap-detail-panel__divider" />

      {node.sourceText ? (
        <>
          <p className="mindmap-detail-panel__label">{t('mindmap.sourceText')}</p>
          <blockquote className="mindmap-detail-panel__source">
            "{node.sourceText}"
          </blockquote>
        </>
      ) : (
        <p className="mindmap-detail-panel__placeholder">
          {node.depth === 0
            ? t('mindmap.nodeDetail')
            : 'Không có đoạn trích dẫn cho node này.'}
        </p>
      )}
    </div>
  );
}
