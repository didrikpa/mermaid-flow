import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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

import { FlowchartIR, IRNode, IREdge } from '../../sync/ir';
import { layoutWithDagre, reactFlowToIRUpdates, FlowNode, FlowEdge } from './irToReactFlow';
import { MermaidNode } from './MermaidNode';
import { PropertyPanel } from './PropertyPanel';
import { ReadOnlyOverlay } from './ReadOnlyOverlay';

interface GraphEditorProps {
  ir: FlowchartIR | null;
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

export const GraphEditor: React.FC<GraphEditorProps> = ({ ir, onVisualChange, syncVersion }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNode>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<FlowEdge>>([]);
  const [selectedNode, setSelectedNode] = useState<Node<FlowNode> | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge<FlowEdge> | null>(null);
  const lastSyncVersionRef = useRef(0);
  const isVisualEditRef = useRef(false);

  // Update React Flow when IR changes (from code editor)
  useEffect(() => {
    if (!ir || syncVersion === lastSyncVersionRef.current) return;
    if (isVisualEditRef.current) {
      isVisualEditRef.current = false;
      return;
    }
    lastSyncVersionRef.current = syncVersion;

    const layout = layoutWithDagre(ir, ir.direction);
    setNodes(layout.nodes);
    setEdges(layout.edges);
  }, [ir, syncVersion, setNodes, setEdges]);

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

      // Notify sync engine
      if (ir) {
        isVisualEditRef.current = true;
        const updates = reactFlowToIRUpdates(nodes, newEdge, ir);
        onVisualChange(updates);
      }
    },
    [edges, nodes, ir, setEdges, onVisualChange]
  );

  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
    setSelectedNode(selNodes.length === 1 ? selNodes[0] as Node<FlowNode> : null);
    setSelectedEdge(selEdges.length === 1 ? selEdges[0] as Edge<FlowEdge> : null);
  }, []);

  const handleNodeUpdate = useCallback(
    (id: string, data: Partial<FlowNode>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
      );

      // Sync back to code
      if (ir) {
        isVisualEditRef.current = true;
        const updatedNodes = nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        );
        const updates = reactFlowToIRUpdates(updatedNodes, edges, ir);
        onVisualChange(updates);
      }
    },
    [nodes, edges, ir, setNodes, onVisualChange]
  );

  const handleEdgeUpdate = useCallback(
    (id: string, data: Partial<FlowEdge>) => {
      setEdges((eds) =>
        eds.map((e) => (e.id === id ? { ...e, data: { ...e.data!, ...data } } : e))
      );

      if (ir) {
        isVisualEditRef.current = true;
        const updatedEdges = edges.map((e) =>
          e.id === id ? { ...e, data: { ...e.data!, ...data } } : e
        );
        const updates = reactFlowToIRUpdates(nodes, updatedEdges, ir);
        onVisualChange(updates);
      }
    },
    [nodes, edges, ir, setEdges, onVisualChange]
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

    if (ir) {
      isVisualEditRef.current = true;
      const updates = reactFlowToIRUpdates(updatedNodes, edges, ir);
      onVisualChange(updates);
    }
  }, [nodes, edges, ir, setNodes, onVisualChange]);

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

    if (ir) {
      isVisualEditRef.current = true;
      const updates = reactFlowToIRUpdates(updatedNodes, updatedEdges, ir);
      onVisualChange(updates);
    }
  }, [nodes, edges, ir, setNodes, setEdges, onVisualChange]);

  // Handle keyboard delete
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        handleDeleteSelected();
      }
    },
    [handleDeleteSelected]
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} onKeyDown={onKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={null} // We handle delete ourselves
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
      />
      {ir && <ReadOnlyOverlay lines={ir.lines} />}
    </div>
  );
};
