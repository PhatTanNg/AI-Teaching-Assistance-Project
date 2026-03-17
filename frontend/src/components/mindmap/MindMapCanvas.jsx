import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import MindMapNode from './MindMapNode.jsx';
import MindMapControls from './MindMapControls.jsx';

const NODE_TYPES = { mindMapNode: MindMapNode };

const NODE_WIDTH = 190;
const NODE_HEIGHT = 48;

// ── Tree → Flow elements ────────────────────────────────────────────────────

function treeToElements(node, parentId = null, depth = 0, idPrefix = 'n') {
  const id = parentId ? `${parentId}-${idPrefix}` : 'root';
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  const flowNode = {
    id,
    type: 'mindMapNode',
    position: { x: 0, y: 0 },
    data: {
      label: node.label ?? node.title ?? '',
      sourceText: node.sourceText ?? null,
      depth,
      collapsed: false,
      hasChildren,
    },
  };

  const nodes = [flowNode];
  const edges = [];

  if (parentId) {
    edges.push({
      id: `e-${parentId}-${id}`,
      source: parentId,
      target: id,
      type: 'smoothstep',
    });
  }

  (node.children || []).forEach((child, i) => {
    const { nodes: cn, edges: ce } = treeToElements(child, id, depth + 1, String(i));
    nodes.push(...cn);
    edges.push(...ce);
  });

  return { nodes, edges };
}

// ── Dagre layout ────────────────────────────────────────────────────────────

function applyLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 70, marginx: 20, marginy: 20 });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });
  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });
}

// ── Helper: collect all descendant ids ─────────────────────────────────────

function getDescendantIds(nodeId, edges) {
  const result = new Set();
  const queue = [nodeId];
  while (queue.length) {
    const current = queue.shift();
    edges.forEach((e) => {
      if (e.source === current && !result.has(e.target)) {
        result.add(e.target);
        queue.push(e.target);
      }
    });
  }
  return result;
}

// ── Inner canvas (needs ReactFlowProvider context) ──────────────────────────

function InnerCanvas({ mapData, onNodeSelect, canvasRef }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();

  // Keep a stable ref to all edges for descendant look-ups inside callbacks
  const edgesRef = useRef(edges);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // Rebuild nodes/edges when mapData changes
  useEffect(() => {
    if (!mapData) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Root node uses mapData.title
    const root = { label: mapData.title, children: mapData.children };
    const { nodes: rawNodes, edges: rawEdges } = treeToElements(root);
    const laidOut = applyLayout(rawNodes, rawEdges);

    setNodes(laidOut);
    setEdges(rawEdges);

    // Fit after a short delay so React Flow has rendered
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
  }, [mapData, fitView, setNodes, setEdges]);

  // Handle node click: collapse/expand children OR notify parent for detail panel
  const onNodeClick = useCallback(
    (_, clickedNode) => {
      const { hasChildren, collapsed, label, sourceText, depth } = clickedNode.data;

      if (hasChildren) {
        // Toggle collapse/expand
        const descendants = getDescendantIds(clickedNode.id, edgesRef.current);

        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === clickedNode.id) {
              return { ...n, data: { ...n.data, collapsed: !collapsed } };
            }
            if (descendants.has(n.id)) {
              return { ...n, hidden: !collapsed };
            }
            return n;
          })
        );

        setEdges((prev) =>
          prev.map((e) => {
            if (e.source === clickedNode.id || descendants.has(e.source)) {
              return { ...e, hidden: !collapsed };
            }
            return e;
          })
        );
      }

      // Always notify parent (show detail panel for this node)
      onNodeSelect({ label, sourceText, depth });
    },
    [onNodeSelect, setNodes, setEdges]
  );

  return (
    <div ref={canvasRef} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={3}
        style={{ background: 'var(--bg-primary)' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="rgba(255,255,255,0.04)"
          gap={24}
          size={1}
        />
        <MindMapControls canvasRef={canvasRef} />
      </ReactFlow>
    </div>
  );
}

// ── Public export (wraps with ReactFlowProvider) ────────────────────────────

export default function MindMapCanvas({ mapData, onNodeSelect }) {
  const canvasRef = useRef(null);

  return (
    <ReactFlowProvider>
      <InnerCanvas mapData={mapData} onNodeSelect={onNodeSelect} canvasRef={canvasRef} />
    </ReactFlowProvider>
  );
}
