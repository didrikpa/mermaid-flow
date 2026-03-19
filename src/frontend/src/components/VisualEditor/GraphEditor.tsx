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
  const lastSyncVersionRef = useRef(0);
  const isVisualEditRef = useRef(false);
  const graphDataRef = useRef<GraphData | null>(null);

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
    const layout = layoutWithDagre(graphData);
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [ir, diagramType, syncVersion, setNodes, setEdges]);

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

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        handleDeleteSelected();
      }
    },
    [handleDeleteSelected]
  );

  // Get IR lines for ReadOnlyOverlay (only flowcharts have this)
  const irLines = diagramType === 'flowchart' && ir ? (ir as FlowchartIR).lines : [];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} onKeyDown={onKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={onSelectionChange}
        onPaneClick={handlePaneClick}
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
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                background: '#fff',
                color: '#ae2a19',
                border: '1px solid #dfe1e6',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Delete
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
    </div>
  );
};
