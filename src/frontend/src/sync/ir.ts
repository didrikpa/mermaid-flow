// Intermediate Representation for bidirectional sync.
// Every line is preserved with its raw source text for roundtrip fidelity.

// ─── Flowchart IR ───────────────────────────────────────────────────────

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

// ─── Sequence Diagram IR ────────────────────────────────────────────────

export interface SequenceParticipant {
  id: string;
  alias: string;
  type: 'participant' | 'actor';
  raw: string;
}

export type SequenceArrowType =
  | 'solid'       // ->>
  | 'solid_open'  // ->
  | 'dashed'      // -->>
  | 'dashed_open' // -->
  | 'cross'       // -x
  | 'dashed_cross' // --x
  | 'async'       // -)
  | 'dashed_async'; // --)

export interface SequenceMessage {
  from: string;
  to: string;
  arrowType: SequenceArrowType;
  text: string;
  raw: string;
}

export type SequenceNotePosition = 'left of' | 'right of' | 'over';

export interface SequenceNote {
  position: SequenceNotePosition;
  participants: string[]; // one for left/right, one or two for over
  text: string;
  raw: string;
}

export interface SequenceActivation {
  action: 'activate' | 'deactivate';
  participant: string;
  raw: string;
}

export type SequenceBlockType = 'loop' | 'alt' | 'else' | 'opt' | 'par' | 'and' | 'critical' | 'break' | 'rect';

export interface SequenceBlockStart {
  blockType: SequenceBlockType;
  label: string;
  raw: string;
}

export type SequenceLineType =
  | 'directive'
  | 'participant'
  | 'message'
  | 'note'
  | 'activation'
  | 'block_start'
  | 'block_end'
  | 'comment'
  | 'empty'
  | 'unknown';

export interface SequenceLine {
  type: SequenceLineType;
  raw: string;
  indent: string;
  participant?: SequenceParticipant;
  message?: SequenceMessage;
  note?: SequenceNote;
  activation?: SequenceActivation;
  block?: SequenceBlockStart;
}

export interface SequenceIR {
  headerRaw: string;
  lines: SequenceLine[];
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
  notes: SequenceNote[];
}

// ─── State Diagram IR ───────────────────────────────────────────────────

export interface StateNode {
  id: string;
  label: string;
  isStart: boolean;
  isEnd: boolean;
  raw: string;
}

export interface StateTransition {
  from: string;
  to: string;
  label: string;
  raw: string;
}

export type StateLineType =
  | 'directive'
  | 'state_def'
  | 'transition'
  | 'note'
  | 'comment'
  | 'empty'
  | 'unknown';

export interface StateLine {
  type: StateLineType;
  raw: string;
  indent: string;
  state?: StateNode;
  transition?: StateTransition;
}

export interface StateIR {
  headerRaw: string;
  lines: StateLine[];
  states: Map<string, StateNode>;
  transitions: StateTransition[];
}

// ─── ER Diagram IR ──────────────────────────────────────────────────────

export type ERCardinality = '||' | '}|' | '}o' | '|{' | 'o{' | '|o' | 'o|' | '||';

export interface EREntity {
  name: string;
  raw: string;
}

export interface ERRelationship {
  entityA: string;
  cardA: string;
  cardB: string;
  entityB: string;
  label: string;
  raw: string;
}

export type ERLineType =
  | 'directive'
  | 'entity'
  | 'relationship'
  | 'comment'
  | 'empty'
  | 'unknown';

export interface ERLine {
  type: ERLineType;
  raw: string;
  indent: string;
  entity?: EREntity;
  relationship?: ERRelationship;
}

export interface ERIR {
  headerRaw: string;
  lines: ERLine[];
  entities: Map<string, EREntity>;
  relationships: ERRelationship[];
}

// ─── Class Diagram IR ───────────────────────────────────────────────────

export interface ClassMember {
  visibility: string; // +, -, #, ~
  name: string;
  type: string;
  isMethod: boolean;
}

export interface ClassNode {
  name: string;
  members: ClassMember[];
  raw: string[];
}

export type ClassRelationType =
  | 'inheritance'   // <|--
  | 'composition'   // *--
  | 'aggregation'   // o--
  | 'association'   // -->
  | 'dependency'    // ..>
  | 'realization'   // ..|>
  | 'link'          // --
  | 'dashed_link';  // ..

export interface ClassRelation {
  classA: string;
  classB: string;
  relationType: ClassRelationType;
  label: string;
  raw: string;
}

export type ClassLineType =
  | 'directive'
  | 'class_start'
  | 'class_end'
  | 'member'
  | 'relation'
  | 'annotation'
  | 'comment'
  | 'empty'
  | 'unknown';

export interface ClassLine {
  type: ClassLineType;
  raw: string;
  indent: string;
  className?: string;
  member?: ClassMember;
  relation?: ClassRelation;
}

export interface ClassIR {
  headerRaw: string;
  lines: ClassLine[];
  classes: Map<string, ClassNode>;
  relations: ClassRelation[];
}
