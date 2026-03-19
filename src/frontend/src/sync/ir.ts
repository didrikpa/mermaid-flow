// Intermediate Representation for bidirectional sync.
// Every line is preserved with its raw source text for roundtrip fidelity.

export interface IRNode {
  id: string;
  label: string;
  shape: NodeShape;
  raw: string; // Original source line
}

export type NodeShape =
  | 'rectangle'    // [text]
  | 'rounded'      // (text)
  | 'stadium'      // ([text])
  | 'subroutine'   // [[text]]
  | 'cylinder'     // [(text)]
  | 'circle'       // ((text))
  | 'asymmetric'   // >text]
  | 'rhombus'      // {text}
  | 'hexagon'      // {{text}}
  | 'parallelogram' // [/text/]
  | 'parallelogram_alt' // [\text\]
  | 'trapezoid'    // [/text\]
  | 'trapezoid_alt' // [\text/]
  | 'double_circle'; // (((text)))

export interface IREdge {
  sourceId: string;
  targetId: string;
  label: string;
  lineStyle: EdgeLineStyle;
  arrowType: EdgeArrowType;
  raw: string;
}

export type EdgeLineStyle = 'solid' | 'dotted' | 'thick';
export type EdgeArrowType = 'arrow' | 'open' | 'cross' | 'circle';

export type IRLineType =
  | 'directive'
  | 'node_def'
  | 'edge_def'
  | 'subgraph_start'
  | 'subgraph_end'
  | 'style'
  | 'class_def'
  | 'class_assign'
  | 'click'
  | 'comment'
  | 'empty'
  | 'unknown';

export interface IRLine {
  type: IRLineType;
  raw: string;
  indent: string;
  // Populated for specific types
  node?: IRNode;
  edge?: IREdge;
  subgraphId?: string;
  subgraphLabel?: string;
}

export interface FlowchartIR {
  direction: string; // TD, TB, BT, RL, LR
  headerRaw: string; // e.g. "graph TD" or "flowchart LR"
  lines: IRLine[];
  // Derived for quick lookup (not serialized)
  nodes: Map<string, IRNode>;
  edges: IREdge[];
}
