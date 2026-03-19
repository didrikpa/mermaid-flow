import dagre from 'dagre';
import { Node, Edge, MarkerType } from '@xyflow/react';
import {
  FlowchartIR, StateIR, ERIR, ClassIR,
  IRNode, IREdge, NodeShape, EdgeLineStyle, EdgeArrowType,
} from '../../sync/ir';
import { DiagramIR } from '../../sync/SyncEngine';

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

// Normalized graph data that all graph-based IRs convert to
export interface GraphData {
  nodes: Map<string, IRNode>;
  edges: IREdge[];
  direction: string;
}

// Shape defaults per diagram type
const TYPE_SHAPES: Record<string, NodeShape> = {
  state: 'rounded',
  er: 'rectangle',
  class: 'rectangle',
};

export function normalizeToGraphData(ir: DiagramIR, diagramType: string): GraphData {
  if (diagramType === 'flowchart') {
    const fir = ir as FlowchartIR;
    return { nodes: fir.nodes, edges: fir.edges, direction: fir.direction };
  }

  if (diagramType === 'state') {
    const sir = ir as StateIR;
    const nodes = new Map<string, IRNode>();

    // Determine if [*] is used as start, end, or both
    const starIsSource = sir.transitions.some(t => t.from === '[*]');
    const starIsTarget = sir.transitions.some(t => t.to === '[*]');

    for (const [id, state] of sir.states) {
      if (id === '[*]') {
        // Split [*] into separate start and end nodes
        if (starIsSource) {
          nodes.set('[*]_start', {
            id: '[*]_start',
            label: '[*]',
            shape: 'circle',
            raw: state.raw,
          });
        }
        if (starIsTarget) {
          nodes.set('[*]_end', {
            id: '[*]_end',
            label: '[*]',
            shape: 'double_circle',
            raw: state.raw,
          });
        }
      } else {
        nodes.set(id, {
          id,
          label: state.label,
          shape: 'rounded',
          raw: state.raw,
        });
      }
    }

    // Rewrite edges to reference the split start/end nodes
    const edges: IREdge[] = sir.transitions.map(t => ({
      sourceId: t.from === '[*]' ? '[*]_start' : t.from,
      targetId: t.to === '[*]' ? '[*]_end' : t.to,
      label: t.label,
      lineStyle: 'solid' as EdgeLineStyle,
      arrowType: 'arrow' as EdgeArrowType,
      raw: t.raw,
    }));
    return { nodes, edges, direction: 'TB' };
  }

  if (diagramType === 'er') {
    const eir = ir as ERIR;
    const nodes = new Map<string, IRNode>();
    for (const [name, entity] of eir.entities) {
      nodes.set(name, {
        id: name,
        label: name,
        shape: 'rectangle',
        raw: entity.raw,
      });
    }
    const edges: IREdge[] = eir.relationships.map(r => ({
      sourceId: r.entityA,
      targetId: r.entityB,
      label: `${r.cardA}--${r.cardB} ${r.label}`,
      lineStyle: 'solid' as EdgeLineStyle,
      arrowType: 'open' as EdgeArrowType,
      raw: r.raw,
    }));
    return { nodes, edges, direction: 'LR' };
  }

  if (diagramType === 'class') {
    const cir = ir as ClassIR;
    const nodes = new Map<string, IRNode>();
    for (const [name, cls] of cir.classes) {
      const memberStr = cls.members.length > 0
        ? '\n' + cls.members.map(m => `${m.visibility}${m.type ? m.type + ' ' : ''}${m.name}`).join('\n')
        : '';
      nodes.set(name, {
        id: name,
        label: name + memberStr,
        shape: 'rectangle',
        raw: cls.raw.join('\n'),
      });
    }
    const edges: IREdge[] = cir.relations.map(r => ({
      sourceId: r.classA,
      targetId: r.classB,
      label: r.label,
      lineStyle: (r.relationType.includes('dashed') || r.relationType === 'dependency' || r.relationType === 'realization') ? 'dotted' as EdgeLineStyle : 'solid' as EdgeLineStyle,
      arrowType: 'arrow' as EdgeArrowType,
      raw: r.raw,
    }));
    return { nodes, edges, direction: 'TB' };
  }

  // Fallback — shouldn't happen
  return { nodes: new Map(), edges: [], direction: 'TB' };
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
  graphData: GraphData,
): { nodes: Node<FlowNode>[]; edges: Edge<FlowEdge>[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  const rankdir = graphData.direction === 'TD' ? 'TB' : graphData.direction;
  g.setGraph({ rankdir, nodesep: 50, ranksep: 50, edgesep: 20, marginx: 20, marginy: 20 });

  // Add nodes
  for (const [id, node] of graphData.nodes) {
    g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT, label: node.label });
  }

  // Add edges
  for (const edge of graphData.edges) {
    g.setEdge(edge.sourceId, edge.targetId);
  }

  dagre.layout(g);

  // Convert to React Flow nodes
  const nodes: Node<FlowNode>[] = [];
  for (const [id, node] of graphData.nodes) {
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
  const edges: Edge<FlowEdge>[] = graphData.edges.map((edge, index) => ({
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
  graphData: GraphData
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
    const existing = graphData.nodes.get(rfNode.id);
    if (!existing) {
      newNodes.push({
        id: rfNode.id,
        label: rfNode.data.label,
        shape: rfNode.data.shape as IRNode['shape'],
        raw: '',
      });
    } else if (existing.label !== rfNode.data.label || existing.shape !== rfNode.data.shape) {
      modifiedNodes.set(rfNode.id, {
        ...existing,
        label: rfNode.data.label,
        shape: rfNode.data.shape as IRNode['shape'],
      });
    }
  }

  // Check for removed nodes
  for (const [id] of graphData.nodes) {
    if (!currentNodeIds.has(id)) {
      removedNodes.add(id);
    }
  }

  // Check for modified/new/removed edges
  const currentEdgeSet = new Set(rfEdges.map(e => `${e.source}-${e.target}`));
  for (const rfEdge of rfEdges) {
    if (rfEdge.data?.irEdgeIndex !== undefined && rfEdge.data.irEdgeIndex >= 0) {
      const origEdge = graphData.edges[rfEdge.data.irEdgeIndex];
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
  for (let i = 0; i < graphData.edges.length; i++) {
    const edge = graphData.edges[i];
    const key = `${edge.sourceId}-${edge.targetId}`;
    if (!currentEdgeSet.has(key)) {
      removedEdges.add(i);
    }
  }

  return { modifiedNodes, modifiedEdges, newNodes, newEdges, removedNodes, removedEdges };
}
