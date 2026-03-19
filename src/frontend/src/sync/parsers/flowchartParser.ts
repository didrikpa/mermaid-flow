import {
  FlowchartIR,
  IRLine,
  IRNode,
  IREdge,
  NodeShape,
  EdgeLineStyle,
  EdgeArrowType,
} from '../ir';

// Node shape patterns: id + shape bracket patterns
const SHAPE_PATTERNS: Array<{ pattern: RegExp; shape: NodeShape }> = [
  { pattern: /^\(\(\((.+?)\)\)\)$/, shape: 'double_circle' },
  { pattern: /^\(\((.+?)\)\)$/, shape: 'circle' },
  { pattern: /^\(\[(.+?)\]\)$/, shape: 'stadium' },
  { pattern: /^\[\((.+?)\)\]$/, shape: 'cylinder' },
  { pattern: /^\[\[(.+?)\]\]$/, shape: 'subroutine' },
  { pattern: /^\[\/(.+?)\\]$/, shape: 'trapezoid' },
  { pattern: /^\[\\(.+?)\/]$/, shape: 'trapezoid_alt' },
  { pattern: /^\[\/(.+?)\/]$/, shape: 'parallelogram' },
  { pattern: /^\[\\(.+?)\\]$/, shape: 'parallelogram_alt' },
  { pattern: /^\{\{(.+?)\}\}$/, shape: 'hexagon' },
  { pattern: /^\{(.+?)\}$/, shape: 'rhombus' },
  { pattern: /^>(.+?)\]$/, shape: 'asymmetric' },
  { pattern: /^\((.+?)\)$/, shape: 'rounded' },
  { pattern: /^\[(.+?)\]$/, shape: 'rectangle' },
];

// Edge patterns: source operator target
const EDGE_OPERATORS: Array<{
  pattern: string;
  lineStyle: EdgeLineStyle;
  arrowType: EdgeArrowType;
}> = [
  { pattern: '==>', lineStyle: 'thick', arrowType: 'arrow' },
  { pattern: '===', lineStyle: 'thick', arrowType: 'open' },
  { pattern: '-.->', lineStyle: 'dotted', arrowType: 'arrow' },
  { pattern: '-.-', lineStyle: 'dotted', arrowType: 'open' },
  { pattern: '-->', lineStyle: 'solid', arrowType: 'arrow' },
  { pattern: '---', lineStyle: 'solid', arrowType: 'open' },
  { pattern: '--x', lineStyle: 'solid', arrowType: 'cross' },
  { pattern: '--o', lineStyle: 'solid', arrowType: 'circle' },
];

function parseNodeShape(shapeText: string): { label: string; shape: NodeShape } {
  for (const { pattern, shape } of SHAPE_PATTERNS) {
    const match = shapeText.match(pattern);
    if (match) {
      return { label: match[1].trim(), shape };
    }
  }
  return { label: shapeText, shape: 'rectangle' };
}

function parseNodeDefinition(id: string, rest: string): IRNode | null {
  const trimmed = rest.trim();
  if (!trimmed) {
    return { id, label: id, shape: 'rectangle', raw: '' };
  }
  const { label, shape } = parseNodeShape(trimmed);
  return { id, label, shape, raw: '' };
}

function tryParseEdge(content: string): { sourceId: string; targetId: string; label: string; lineStyle: EdgeLineStyle; arrowType: EdgeArrowType; sourceShape?: string; targetShape?: string } | null {
  // Try each operator
  for (const { pattern, lineStyle, arrowType } of EDGE_OPERATORS) {
    // Check for labeled edges: A -->|label| B or A[shape] -->|label| B[shape]
    const labeledPipeRegex = new RegExp(
      `^([\\w]+)((?:[^\\w].*?)?)\\s*${escapeRegex(pattern)}\\|([^|]*)\\|\\s*([\\w]+)(.*)?$`
    );
    const labeledPipeMatch = content.match(labeledPipeRegex);
    if (labeledPipeMatch) {
      return {
        sourceId: labeledPipeMatch[1],
        sourceShape: labeledPipeMatch[2]?.trim(),
        targetId: labeledPipeMatch[4],
        label: labeledPipeMatch[3].trim(),
        lineStyle,
        arrowType,
        targetShape: labeledPipeMatch[5]?.trim(),
      };
    }

    // Simple: A --> B or A[shape] --> B[shape]
    const simpleRegex = new RegExp(
      `^([\\w]+)((?:[^\\w].*?)?)\\s*${escapeRegex(pattern)}\\s*([\\w]+)(.*)?$`
    );
    const simpleMatch = content.match(simpleRegex);
    if (simpleMatch) {
      return {
        sourceId: simpleMatch[1],
        sourceShape: simpleMatch[2]?.trim(),
        targetId: simpleMatch[3],
        label: '',
        lineStyle,
        arrowType,
        targetShape: simpleMatch[4]?.trim(),
      };
    }
  }
  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseFlowchart(code: string): FlowchartIR {
  const rawLines = code.split('\n');
  const lines: IRLine[] = [];
  const nodes = new Map<string, IRNode>();
  const edges: IREdge[] = [];
  let direction = 'TD';
  let headerRaw = '';

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const indent = rawLine.match(/^(\s*)/)?.[1] ?? '';
    const trimmed = rawLine.trim();

    // Empty lines
    if (!trimmed) {
      lines.push({ type: 'empty', raw: rawLine, indent });
      continue;
    }

    // Header line (graph/flowchart directive)
    if (i === 0 || (!headerRaw && trimmed.match(/^(graph|flowchart)\s+(TD|TB|BT|RL|LR)/i))) {
      const headerMatch = trimmed.match(/^(graph|flowchart)\s+(TD|TB|BT|RL|LR)/i);
      if (headerMatch) {
        direction = headerMatch[2].toUpperCase();
        headerRaw = rawLine;
        lines.push({ type: 'directive', raw: rawLine, indent });
        continue;
      }
    }

    // Comments
    if (trimmed.startsWith('%%')) {
      lines.push({ type: 'comment', raw: rawLine, indent });
      continue;
    }

    // Subgraph start
    const subgraphMatch = trimmed.match(/^subgraph\s+(\w+)(?:\s*\[(.+)\])?/);
    if (subgraphMatch) {
      lines.push({
        type: 'subgraph_start',
        raw: rawLine,
        indent,
        subgraphId: subgraphMatch[1],
        subgraphLabel: subgraphMatch[2] || subgraphMatch[1],
      });
      continue;
    }

    // Subgraph end
    if (trimmed === 'end') {
      lines.push({ type: 'subgraph_end', raw: rawLine, indent });
      continue;
    }

    // Style lines
    if (trimmed.match(/^style\s+/)) {
      lines.push({ type: 'style', raw: rawLine, indent });
      continue;
    }

    // classDef
    if (trimmed.match(/^classDef\s+/)) {
      lines.push({ type: 'class_def', raw: rawLine, indent });
      continue;
    }

    // class assignment
    if (trimmed.match(/^class\s+/)) {
      lines.push({ type: 'class_assign', raw: rawLine, indent });
      continue;
    }

    // click handler
    if (trimmed.match(/^click\s+/)) {
      lines.push({ type: 'click', raw: rawLine, indent });
      continue;
    }

    // Try to parse as edge
    const edgeResult = tryParseEdge(trimmed);
    if (edgeResult) {
      // Register source node if not seen (or update if shape info provided)
      if (!nodes.has(edgeResult.sourceId)) {
        let sourceNode: IRNode;
        if (edgeResult.sourceShape) {
          const parsed = parseNodeShape(edgeResult.sourceShape);
          sourceNode = {
            id: edgeResult.sourceId,
            label: parsed.label || edgeResult.sourceId,
            shape: parsed.shape,
            raw: rawLine,
          };
        } else {
          sourceNode = {
            id: edgeResult.sourceId,
            label: edgeResult.sourceId,
            shape: 'rectangle',
            raw: rawLine,
          };
        }
        nodes.set(edgeResult.sourceId, sourceNode);
      } else if (edgeResult.sourceShape) {
        const existing = nodes.get(edgeResult.sourceId)!;
        const parsed = parseNodeShape(edgeResult.sourceShape);
        if (parsed.label) {
          existing.label = parsed.label;
          existing.shape = parsed.shape;
        }
      }

      // Register target node with shape if provided
      if (!nodes.has(edgeResult.targetId)) {
        let targetNode: IRNode;
        if (edgeResult.targetShape) {
          const parsed = parseNodeShape(edgeResult.targetShape);
          targetNode = {
            id: edgeResult.targetId,
            label: parsed.label || edgeResult.targetId,
            shape: parsed.shape,
            raw: rawLine,
          };
        } else {
          targetNode = {
            id: edgeResult.targetId,
            label: edgeResult.targetId,
            shape: 'rectangle',
            raw: rawLine,
          };
        }
        nodes.set(edgeResult.targetId, targetNode);
      } else if (edgeResult.targetShape) {
        // Update shape if target shape info provided on this line
        const existing = nodes.get(edgeResult.targetId)!;
        const parsed = parseNodeShape(edgeResult.targetShape);
        if (parsed.label) {
          existing.label = parsed.label;
          existing.shape = parsed.shape;
        }
      }

      const edge: IREdge = {
        sourceId: edgeResult.sourceId,
        targetId: edgeResult.targetId,
        label: edgeResult.label,
        lineStyle: edgeResult.lineStyle,
        arrowType: edgeResult.arrowType,
        raw: rawLine,
      };
      edges.push(edge);
      lines.push({ type: 'edge_def', raw: rawLine, indent, edge });
      continue;
    }

    // Try to parse as standalone node definition: ID[label] or just ID
    const nodeDefMatch = trimmed.match(/^([a-zA-Z_]\w*)([\s\S]*)$/);
    if (nodeDefMatch) {
      const id = nodeDefMatch[1];
      const rest = nodeDefMatch[2].trim();
      const node = parseNodeDefinition(id, rest);
      if (node) {
        node.raw = rawLine;
        if (nodes.has(id)) {
          // Update existing node with new shape/label info
          const existing = nodes.get(id)!;
          if (rest) {
            existing.label = node.label;
            existing.shape = node.shape;
            existing.raw = rawLine;
          }
        } else {
          nodes.set(id, node);
        }
        lines.push({ type: 'node_def', raw: rawLine, indent, node });
        continue;
      }
    }

    // Unknown line — preserve as-is
    lines.push({ type: 'unknown', raw: rawLine, indent });
  }

  return { direction, headerRaw, lines, nodes, edges };
}
