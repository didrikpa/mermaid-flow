import {
  FlowchartIR,
  IRNode,
  IREdge,
  IRLine,
  NodeShape,
  EdgeLineStyle,
  EdgeArrowType,
} from '../ir';

const SHAPE_WRAPPERS: Record<NodeShape, [string, string]> = {
  rectangle: ['[', ']'],
  rounded: ['(', ')'],
  stadium: ['([', '])'],
  subroutine: ['[[', ']]'],
  cylinder: ['[(', ')]'],
  circle: ['((', '))'],
  asymmetric: ['>', ']'],
  rhombus: ['{', '}'],
  hexagon: ['{{', '}}'],
  parallelogram: ['[/', '/]'],
  parallelogram_alt: ['[\\', '\\]'],
  trapezoid: ['[/', '\\]'],
  trapezoid_alt: ['[\\', '/]'],
  double_circle: ['(((', ')))'],
};

const EDGE_OPERATOR_MAP: Record<string, string> = {
  'solid-arrow': '-->',
  'solid-open': '---',
  'solid-cross': '--x',
  'solid-circle': '--o',
  'dotted-arrow': '-.->',
  'dotted-open': '-.-',
  'thick-arrow': '==>',
  'thick-open': '===',
};

function serializeNodeShape(node: IRNode): string {
  const [open, close] = SHAPE_WRAPPERS[node.shape] ?? ['[', ']'];
  return `${node.id}${open}${node.label}${close}`;
}

function serializeEdge(edge: IREdge, nodeMap?: Map<string, IRNode>, reserializeAll?: boolean): string {
  const key = `${edge.lineStyle}-${edge.arrowType}`;
  const op = EDGE_OPERATOR_MAP[key] ?? '-->';

  // When re-serializing an edge line, always include shape definitions for
  // both nodes so that inline shape info isn't lost for the unmodified node.
  let sourceStr = edge.sourceId;
  let targetStr = edge.targetId;

  if (reserializeAll && nodeMap) {
    const sourceNode = nodeMap.get(edge.sourceId);
    if (sourceNode) sourceStr = serializeNodeShape(sourceNode);
    const targetNode = nodeMap.get(edge.targetId);
    if (targetNode) targetStr = serializeNodeShape(targetNode);
  }

  if (edge.label) {
    return `${sourceStr} ${op}|${edge.label}| ${targetStr}`;
  }
  return `${sourceStr} ${op} ${targetStr}`;
}

export function serializeFlowchart(ir: FlowchartIR, modified?: {
  modifiedNodes?: Set<string>;
  modifiedEdges?: Set<number>;
  newNodes?: IRNode[];
  newEdges?: IREdge[];
  removedNodes?: Set<string>;
  removedEdges?: Set<number>;
}): string {
  const result: string[] = [];

  // Track which edges we've output (by index in ir.edges)
  let edgeIndex = 0;

  for (const line of ir.lines) {
    // Check if a node on this line was removed
    if (line.type === 'node_def' && line.node && modified?.removedNodes?.has(line.node.id)) {
      continue; // Skip removed nodes
    }

    // Check if an edge on this line was removed
    if (line.type === 'edge_def' && line.edge) {
      if (modified?.removedEdges?.has(edgeIndex)) {
        edgeIndex++;
        continue; // Skip removed edges
      }
    }

    // If not modified, emit the raw source line (roundtrip fidelity)
    if (line.type === 'node_def' && line.node && modified?.modifiedNodes?.has(line.node.id)) {
      const updatedNode = ir.nodes.get(line.node.id);
      if (updatedNode) {
        result.push(line.indent + serializeNodeShape(updatedNode));
      } else {
        result.push(line.raw);
      }
    } else if (line.type === 'edge_def' && line.edge) {
      const edgeModified = modified?.modifiedEdges?.has(edgeIndex);
      const sourceModified = modified?.modifiedNodes?.has(line.edge.sourceId);
      const targetModified = modified?.modifiedNodes?.has(line.edge.targetId);
      if (edgeModified || sourceModified || targetModified) {
        result.push(line.indent + serializeEdge(line.edge, ir.nodes, true));
      } else {
        result.push(line.raw);
      }
      edgeIndex++;
    } else {
      result.push(line.raw);
      if (line.type === 'edge_def') {
        edgeIndex++;
      }
    }
  }

  // Append new nodes at the end (before any trailing empty lines)
  if (modified?.newNodes?.length) {
    const defaultIndent = '    ';
    for (const node of modified.newNodes) {
      result.push(defaultIndent + serializeNodeShape(node));
    }
  }

  // Append new edges at the end
  if (modified?.newEdges?.length) {
    const defaultIndent = '    ';
    for (const edge of modified.newEdges) {
      result.push(defaultIndent + serializeEdge(edge));
    }
  }

  return result.join('\n');
}
