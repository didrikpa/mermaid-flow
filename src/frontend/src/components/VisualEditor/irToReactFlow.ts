import dagre from 'dagre';
import { Node, Edge, MarkerType } from '@xyflow/react';
import { FlowchartIR, IRNode, IREdge, EdgeLineStyle, EdgeArrowType } from '../../sync/ir';

export interface FlowNode extends Record<string, unknown> {
  label: string;
  shape: string;
}

export interface FlowEdge extends Record<string, unknown> {
  label: string;
  lineStyle: EdgeLineStyle;
  arrowType: EdgeArrowType;
  irEdgeIndex: number;
}

const NODE_WIDTH = 172;
const NODE_HEIGHT = 36;

function getMarkerEnd(arrowType: EdgeArrowType): { type: MarkerType } | undefined {
  switch (arrowType) {
    case 'arrow': return { type: MarkerType.ArrowClosed };
    case 'open': return undefined;
    case 'cross': return { type: MarkerType.ArrowClosed };
    case 'circle': return { type: MarkerType.ArrowClosed };
    default: return { type: MarkerType.ArrowClosed };
  }
}

function getEdgeStyle(lineStyle: EdgeLineStyle): React.CSSProperties {
  switch (lineStyle) {
    case 'dotted': return { strokeDasharray: '5,5' };
    case 'thick': return { strokeWidth: 3 };
    default: return {};
  }
}

export function layoutWithDagre(
  ir: FlowchartIR,
  direction: string = 'TB'
): { nodes: Node<FlowNode>[]; edges: Edge<FlowEdge>[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  const rankdir = direction === 'TD' ? 'TB' : direction;
  g.setGraph({ rankdir, nodesep: 50, ranksep: 50, edgesep: 20, marginx: 20, marginy: 20 });

  // Add nodes
  for (const [id, node] of ir.nodes) {
    g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT, label: node.label });
  }

  // Add edges
  for (const edge of ir.edges) {
    g.setEdge(edge.sourceId, edge.targetId);
  }

  dagre.layout(g);

  // Convert to React Flow nodes
  const nodes: Node<FlowNode>[] = [];
  for (const [id, node] of ir.nodes) {
    const dagreNode = g.node(id);
    if (dagreNode) {
      nodes.push({
        id,
        type: 'mermaidNode',
        position: {
          x: dagreNode.x - NODE_WIDTH / 2,
          y: dagreNode.y - NODE_HEIGHT / 2,
        },
        data: {
          label: node.label,
          shape: node.shape,
        },
      });
    }
  }

  // Convert to React Flow edges
  const edges: Edge<FlowEdge>[] = ir.edges.map((edge, index) => ({
    id: `e-${edge.sourceId}-${edge.targetId}-${index}`,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.label || undefined,
    markerEnd: getMarkerEnd(edge.arrowType),
    style: getEdgeStyle(edge.lineStyle),
    data: {
      label: edge.label,
      lineStyle: edge.lineStyle,
      arrowType: edge.arrowType,
      irEdgeIndex: index,
    },
  }));

  return { nodes, edges };
}

export function reactFlowToIRUpdates(
  rfNodes: Node<FlowNode>[],
  rfEdges: Edge<FlowEdge>[],
  originalIR: FlowchartIR
): {
  modifiedNodes: Map<string, IRNode>;
  modifiedEdges: Map<number, IREdge>;
  newNodes: IRNode[];
  newEdges: IREdge[];
  removedNodes: Set<string>;
  removedEdges: Set<number>;
} {
  const modifiedNodes = new Map<string, IRNode>();
  const newNodes: IRNode[] = [];
  const removedNodes = new Set<string>();
  const modifiedEdges = new Map<number, IREdge>();
  const newEdges: IREdge[] = [];
  const removedEdges = new Set<number>();

  // Check for modified/new nodes
  const currentNodeIds = new Set(rfNodes.map(n => n.id));
  for (const rfNode of rfNodes) {
    const existing = originalIR.nodes.get(rfNode.id);
    if (!existing) {
      // New node
      newNodes.push({
        id: rfNode.id,
        label: rfNode.data.label,
        shape: rfNode.data.shape as IRNode['shape'],
        raw: '',
      });
    } else if (existing.label !== rfNode.data.label || existing.shape !== rfNode.data.shape) {
      // Modified node
      modifiedNodes.set(rfNode.id, {
        ...existing,
        label: rfNode.data.label,
        shape: rfNode.data.shape as IRNode['shape'],
      });
    }
  }

  // Check for removed nodes
  for (const [id] of originalIR.nodes) {
    if (!currentNodeIds.has(id)) {
      removedNodes.add(id);
    }
  }

  // Check for modified/new/removed edges
  const currentEdgeSet = new Set(rfEdges.map(e => `${e.source}-${e.target}`));
  for (const rfEdge of rfEdges) {
    if (rfEdge.data?.irEdgeIndex !== undefined) {
      const origEdge = originalIR.edges[rfEdge.data.irEdgeIndex];
      if (origEdge) {
        if (
          origEdge.sourceId !== rfEdge.source ||
          origEdge.targetId !== rfEdge.target ||
          origEdge.label !== (rfEdge.data.label || '')
        ) {
          modifiedEdges.set(rfEdge.data.irEdgeIndex, {
            ...origEdge,
            sourceId: rfEdge.source,
            targetId: rfEdge.target,
            label: rfEdge.data.label || '',
          });
        }
      }
    } else {
      // New edge
      newEdges.push({
        sourceId: rfEdge.source,
        targetId: rfEdge.target,
        label: (rfEdge as Edge).label as string || '',
        lineStyle: 'solid',
        arrowType: 'arrow',
        raw: '',
      });
    }
  }

  // Check for removed edges
  for (let i = 0; i < originalIR.edges.length; i++) {
    const edge = originalIR.edges[i];
    const key = `${edge.sourceId}-${edge.targetId}`;
    if (!currentEdgeSet.has(key)) {
      removedEdges.add(i);
    }
  }

  return { modifiedNodes, modifiedEdges, newNodes, newEdges, removedNodes, removedEdges };
}
