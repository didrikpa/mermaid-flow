import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  NodeTypes,
  OnSelectionChangeParams,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { IRNode, IREdge, FlowchartIR } from '../../sync/ir';
import { DiagramIR } from '../../sync/SyncEngine';
import { normalizeToGraphData, layoutWithDagre, reactFlowToIRUpdates, GraphData, FlowNode, FlowEdge } from './irToReactFlow';
import { MermaidNode } from './MermaidNode';
import { PropertyPanel } from './PropertyPanel';
import { ReadOnlyOverlay } from './ReadOnlyOverlay';
import { ContextMenu, ContextMenuItem } from './ContextMenu';

interface GraphEditorProps {
  ir: DiagramIR | null;
  diagramType: string;
  onVisualChange: (updates: {
    modifiedNodes?: Map<string, IRNode>;
    modifiedEdges?: Map<number, IREdge>;
    newNodes?: IRNode[];
    newEdges?: IREdge[];
    removedNodes?: Set<string>;
    removedEdges?: Set<number>;
  }) => void;
  syncVersion: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: NodeTypes = {
  mermaidNode: MermaidNode as any,
};

let nextNodeId = 1;

export const GraphEditor: React.FC<GraphEditorProps> = ({ ir, diagramType, onVisualChange, syncVersion }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNode>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<FlowEdge>>([]);
  const [selectedNode, setSelectedNode] = useState<Node<FlowNode> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge<FlowEdge> | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; edgeId?: string } | null>(null);
  const lastSyncVersionRef = useRef(0);
  const isVisualEditRef = useRef(false);
  const graphDataRef = useRef<GraphData | null>(null);
  const hasInitialLayout = useRef(false);
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Update React Flow when IR changes (from code editor)
  useEffect(() => {
    if (!ir || syncVersion === lastSyncVersionRef.current) return;
    if (isVisualEditRef.current) {
      isVisualEditRef.current = false;
      return;
    }
    lastSyncVersionRef.current = syncVersion;

    const graphData = normalizeToGraphData(ir, diagramType);
    graphDataRef.current = graphData;

    if (!hasInitialLayout.current) {
      // First load — run full dagre layout
      hasInitialLayout.current = true;
      const layout = layoutWithDagre(graphData);
      // Cache positions
      for (const node of layout.nodes) {
        nodePositionsRef.current.set(node.id, { ...node.position });
      }
      setNodes(layout.nodes);
      setEdges(layout.edges);
    } else {
      // Subsequent code changes — update data in-place, preserve positions
      setNodes((prevNodes) => {
        const prevById = new Map(prevNodes.map(n => [n.id, n]));
        const updatedNodes: Node<FlowNode>[] = [];

        for (const [id, irNode] of graphData.nodes) {
          const existing = prevById.get(id);
          if (existing) {
            // Update data but keep position
            updatedNodes.push({
              ...existing,
              data: { label: irNode.label, shape: irNode.shape },
            });
          } else {
            // New node — use dagre for just this node or a default position
            const pos = nodePositionsRef.current.get(id) || {
              x: 100 + Math.random() * 200,
              y: 100 + Math.random() * 200,
            };
            updatedNodes.push({
              id,
              type: 'mermaidNode',
              position: pos,
              data: { label: irNode.label, shape: irNode.shape },
            });
          }
        }
        return updatedNodes;
      });
      // Always update edges from IR
      const layout = layoutWithDagre(graphData);
      setEdges(layout.edges);
    }
  }, [ir, diagramType, syncVersion, setNodes, setEdges]);

  // Track node position changes from dragging
  const handleNodesChangeWrapped = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      // Update position cache for position changes
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          nodePositionsRef.current.set(change.id, { ...change.position });
        }
      }
    },
    [onNodesChange]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const newEdge = addEdge(
        {
          ...connection,
          data: { label: '', lineStyle: 'solid' as const, arrowType: 'arrow' as const, irEdgeIndex: -1 },
        },
        edges
      );
      setEdges(newEdge);

      if (graphDataRef.current) {
        isVisualEditRef.current = true;
        const updates = reactFlowToIRUpdates(nodes, newEdge, graphDataRef.current);
        onVisualChange(updates);
      }
    },
    [edges, nodes, setEdges, onVisualChange]
  );

  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
    setSelectedNode(selNodes.length === 1 ? selNodes[0] as Node<FlowNode> : null);
    setSelectedEdge(selEdges.length === 1 ? selEdges[0] as Edge<FlowEdge> : null);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleNodeUpdate = useCallback(
    (id: string, data: Partial<FlowNode>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
      );

      if (graphDataRef.current) {
        isVisualEditRef.current = true;
        const updatedNodes = nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        );
        const updates = reactFlowToIRUpdates(updatedNodes, edges, graphDataRef.current);
        onVisualChange(updates);
      }
    },
    [nodes, edges, setNodes, onVisualChange]
  );

  const handleEdgeUpdate = useCallback(
    (id: string, data: Partial<FlowEdge>) => {
      setEdges((eds) =>
        eds.map((e) => (e.id === id ? { ...e, data: { ...e.data!, ...data } } : e))
      );

      if (graphDataRef.current) {
        isVisualEditRef.current = true;
        const updatedEdges = edges.map((e) =>
          e.id === id ? { ...e, data: { ...e.data!, ...data } } : e
        );
        const updates = reactFlowToIRUpdates(nodes, updatedEdges, graphDataRef.current);
        onVisualChange(updates);
      }
    },
    [nodes, edges, setEdges, onVisualChange]
  );

  const handleAddNode = useCallback(() => {
    const id = `node_${nextNodeId++}`;
    const newNode: Node<FlowNode> = {
      id,
      type: 'mermaidNode',
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { label: 'New Node', shape: 'rectangle' },
    };
    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);

    if (graphDataRef.current) {
      isVisualEditRef.current = true;
      const updates = reactFlowToIRUpdates(updatedNodes, edges, graphDataRef.current);
      onVisualChange(updates);
    }
  }, [nodes, edges, setNodes, onVisualChange]);

  const handleDeleteSelected = useCallback(() => {
    const nodeIdsToRemove = new Set(
      nodes.filter((n) => n.selected).map((n) => n.id)
    );
    const updatedNodes = nodes.filter((n) => !n.selected);
    const updatedEdges = edges.filter(
      (e) => !e.selected && !nodeIdsToRemove.has(e.source) && !nodeIdsToRemove.has(e.target)
    );
    setNodes(updatedNodes);
    setEdges(updatedEdges);

    if (graphDataRef.current) {
      isVisualEditRef.current = true;
      const updates = reactFlowToIRUpdates(updatedNodes, updatedEdges, graphDataRef.current);
      onVisualChange(updates);
    }
  }, [nodes, edges, setNodes, setEdges, onVisualChange]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (!sourceNode) return;
    const id = `node_${nextNodeId++}`;
    const newNode: Node<FlowNode> = {
      id,
      type: 'mermaidNode',
      position: { x: sourceNode.position.x + 30, y: sourceNode.position.y + 30 },
      data: { ...sourceNode.data },
    };
    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);

    if (graphDataRef.current) {
      isVisualEditRef.current = true;
      const updates = reactFlowToIRUpdates(updatedNodes, edges, graphDataRef.current);
      onVisualChange(updates);
    }
  }, [nodes, edges, setNodes, onVisualChange]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, edgeId: edge.id });
  }, []);

  const handleCloseContextMenu = useCallback(() => setContextMenu(null), []);

  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    if (!contextMenu) return [];
    if (contextMenu.nodeId) {
      return [
        {
          label: 'Edit label',
          action: () => {
            const node = nodes.find(n => n.id === contextMenu.nodeId);
            if (node) setSelectedNode(node as Node<FlowNode>);
          },
        },
        {
          label: 'Duplicate',
          action: () => handleDuplicateNode(contextMenu.nodeId!),
        },
        {
          label: 'Delete',
          danger: true,
          action: () => {
            const updatedNodes = nodes.filter(n => n.id !== contextMenu.nodeId);
            const updatedEdges = edges.filter(e => e.source !== contextMenu.nodeId && e.target !== contextMenu.nodeId);
            setNodes(updatedNodes);
            setEdges(updatedEdges);
            if (graphDataRef.current) {
              isVisualEditRef.current = true;
              const updates = reactFlowToIRUpdates(updatedNodes, updatedEdges, graphDataRef.current);
              onVisualChange(updates);
            }
          },
        },
      ];
    }
    if (contextMenu.edgeId) {
      return [
        {
          label: 'Edit edge',
          action: () => {
            const edge = edges.find(e => e.id === contextMenu.edgeId);
            if (edge) setSelectedEdge(edge as Edge<FlowEdge>);
          },
        },
        {
          label: 'Delete',
          danger: true,
          action: () => {
            const updatedEdges = edges.filter(e => e.id !== contextMenu.edgeId);
            setEdges(updatedEdges);
            if (graphDataRef.current) {
              isVisualEditRef.current = true;
              const updates = reactFlowToIRUpdates(nodes, updatedEdges, graphDataRef.current);
              onVisualChange(updates);
            }
          },
        },
      ];
    }
    return [];
  }, [contextMenu, nodes, edges, setNodes, setEdges, onVisualChange, handleDuplicateNode]);

  // Alignment tools — operate on all selected nodes
  const getSelectedNodes = useCallback(() => nodes.filter(n => n.selected), [nodes]);

  const handleAlign = useCallback((direction: 'left' | 'top' | 'h-distribute' | 'v-distribute') => {
    const selected = getSelectedNodes();
    if (selected.length < 2) return;

    setNodes((nds) => {
      const selectedIds = new Set(selected.map(n => n.id));
      const selectedList = nds.filter(n => selectedIds.has(n.id));

      let updates: Map<string, { x: number; y: number }>;
      switch (direction) {
        case 'left': {
          const minX = Math.min(...selectedList.map(n => n.position.x));
          updates = new Map(selectedList.map(n => [n.id, { x: minX, y: n.position.y }]));
          break;
        }
        case 'top': {
          const minY = Math.min(...selectedList.map(n => n.position.y));
          updates = new Map(selectedList.map(n => [n.id, { x: n.position.x, y: minY }]));
          break;
        }
        case 'h-distribute': {
          const sorted = [...selectedList].sort((a, b) => a.position.x - b.position.x);
          const minX = sorted[0].position.x;
          const maxX = sorted[sorted.length - 1].position.x;
          const step = (maxX - minX) / (sorted.length - 1);
          updates = new Map(sorted.map((n, i) => [n.id, { x: minX + i * step, y: n.position.y }]));
          break;
        }
        case 'v-distribute': {
          const sorted = [...selectedList].sort((a, b) => a.position.y - b.position.y);
          const minY = sorted[0].position.y;
          const maxY = sorted[sorted.length - 1].position.y;
          const step = (maxY - minY) / (sorted.length - 1);
          updates = new Map(sorted.map((n, i) => [n.id, { x: n.position.x, y: minY + i * step }]));
          break;
        }
      }

      return nds.map(n => {
        const newPos = updates.get(n.id);
        if (newPos) {
          nodePositionsRef.current.set(n.id, newPos);
          return { ...n, position: newPos };
        }
        return n;
      });
    });
  }, [getSelectedNodes, setNodes]);

  const handleAutoLayout = useCallback(() => {
    if (!graphDataRef.current) return;
    const layout = layoutWithDagre(graphDataRef.current);
    for (const node of layout.nodes) {
      nodePositionsRef.current.set(node.id, { ...node.position });
    }
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [setNodes, setEdges]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        handleDeleteSelected();
      }
      if (event.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdge(null);
        setContextMenu(null);
        // Deselect all nodes/edges
        setNodes(nds => nds.map(n => ({ ...n, selected: false })));
        setEdges(eds => eds.map(e => ({ ...e, selected: false })));
      }
    },
    [handleDeleteSelected, setNodes, setEdges]
  );

  // Get IR lines for ReadOnlyOverlay (only flowcharts have this)
  const irLines = diagramType === 'flowchart' && ir ? (ir as FlowchartIR).lines : [];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} onKeyDown={onKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChangeWrapped}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={onSelectionChange}
        onPaneClick={handlePaneClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={null}
      >
        <Background gap={16} size={1} color="#ebecf0" />
        <Controls />
        <MiniMap
          nodeColor="#4c9aff"
          nodeStrokeWidth={2}
          style={{ background: '#f4f5f7', border: '1px solid #dfe1e6' }}
        />
        <Panel position="top-left">
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={handleAddNode}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                background: '#0052cc',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              + Add Node
            </button>
            <button
              onClick={handleDeleteSelected}
              style={{ ...secondaryBtnStyle, color: '#ae2a19' }}
            >
              Delete
            </button>
            <button
              onClick={handleAutoLayout}
              style={secondaryBtnStyle}
            >
              Auto Layout
            </button>
            <span style={{ width: 1, height: 20, background: '#dfe1e6' }} />
            <button
              onClick={() => handleAlign('left')}
              title="Align left (select 2+ nodes)"
              style={secondaryBtnStyle}
            >
              Align L
            </button>
            <button
              onClick={() => handleAlign('top')}
              title="Align top (select 2+ nodes)"
              style={secondaryBtnStyle}
            >
              Align T
            </button>
            <button
              onClick={() => handleAlign('h-distribute')}
              title="Distribute horizontally (select 2+ nodes)"
              style={secondaryBtnStyle}
            >
              Dist H
            </button>
            <button
              onClick={() => handleAlign('v-distribute')}
              title="Distribute vertically (select 2+ nodes)"
              style={secondaryBtnStyle}
            >
              Dist V
            </button>
          </div>
        </Panel>
      </ReactFlow>
      <PropertyPanel
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onNodeUpdate={handleNodeUpdate}
        onEdgeUpdate={handleEdgeUpdate}
        onClose={handleClosePanel}
      />
      {irLines.length > 0 && <ReadOnlyOverlay lines={irLines} />}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 500,
  background: '#fff',
  color: '#42526e',
  border: '1px solid #dfe1e6',
  borderRadius: 4,
  cursor: 'pointer',
};
