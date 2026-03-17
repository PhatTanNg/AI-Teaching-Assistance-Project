import { Handle, Position } from '@xyflow/react';

const DEPTH_COLORS = {
  0: 'var(--accent-primary)',
  1: 'var(--accent-purple)',
  2: 'var(--glass-border)',
  3: 'var(--card-border)',
};

export default function MindMapNode({ data, selected }) {
  const depth = Math.min(data.depth ?? 0, 3);
  const borderColor = DEPTH_COLORS[depth];

  return (
    <div
      className={`mindmap-node mindmap-node--depth-${depth}`}
      style={{ borderColor, outline: selected ? `2px solid ${borderColor}` : 'none', outlineOffset: '2px' }}
    >
      {/* Target handle (left) — hidden via CSS */}
      <Handle type="target" position={Position.Left} />

      {/* Collapse/expand indicator */}
      {data.hasChildren && (
        <span className="mindmap-node__toggle" title={data.collapsed ? 'Expand' : 'Collapse'}>
          {data.collapsed ? '+' : '−'}
        </span>
      )}

      <span className="mindmap-node__label">{data.label}</span>

      {/* Source handle (right) — hidden via CSS */}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
