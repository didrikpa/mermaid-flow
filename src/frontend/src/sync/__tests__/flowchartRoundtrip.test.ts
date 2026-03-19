import { describe, test, expect } from 'vitest';
import { parseFlowchart } from '../parsers/flowchartParser';
import { serializeFlowchart } from '../serializers/flowchartSerializer';

function roundtrip(code: string): string {
  const ir = parseFlowchart(code);
  return serializeFlowchart(ir);
}

describe('Flowchart roundtrip: serialize(parse(code)) === code', () => {
  test('simple graph TD', () => {
    const code = `graph TD
    A --> B`;
    expect(roundtrip(code)).toBe(code);
  });

  test('flowchart LR', () => {
    const code = `flowchart LR
    A --> B`;
    expect(roundtrip(code)).toBe(code);
  });

  test('nodes with labels', () => {
    const code = `graph TD
    A[Start] --> B[End]`;
    expect(roundtrip(code)).toBe(code);
  });

  test('node shapes', () => {
    const code = `graph TD
    A(Rounded)
    B{Diamond}
    C((Circle))
    D([Stadium])
    E[[Subroutine]]`;
    expect(roundtrip(code)).toBe(code);
  });

  test('edge labels with pipe syntax', () => {
    const code = `graph TD
    A -->|Yes| B
    A -->|No| C`;
    expect(roundtrip(code)).toBe(code);
  });

  test('different edge styles', () => {
    const code = `graph TD
    A --> B
    C --- D
    E ==> F
    G -.-> H`;
    expect(roundtrip(code)).toBe(code);
  });

  test('comments preserved', () => {
    const code = `graph TD
    %% This is a comment
    A --> B
    %% Another comment`;
    expect(roundtrip(code)).toBe(code);
  });

  test('empty lines preserved', () => {
    const code = `graph TD

    A --> B

    B --> C`;
    expect(roundtrip(code)).toBe(code);
  });

  test('subgraph', () => {
    const code = `graph TD
    subgraph sub1
    A --> B
    end`;
    expect(roundtrip(code)).toBe(code);
  });

  test('subgraph with label', () => {
    const code = `graph TD
    subgraph sub1[My Subgraph]
    A --> B
    end`;
    expect(roundtrip(code)).toBe(code);
  });

  test('style lines preserved', () => {
    const code = `graph TD
    A --> B
    style A fill:#f9f,stroke:#333`;
    expect(roundtrip(code)).toBe(code);
  });

  test('classDef preserved', () => {
    const code = `graph TD
    classDef default fill:#f9f
    A --> B`;
    expect(roundtrip(code)).toBe(code);
  });

  test('click handler preserved', () => {
    const code = `graph TD
    A --> B
    click A "https://example.com"`;
    expect(roundtrip(code)).toBe(code);
  });

  test('mixed indentation preserved', () => {
    const code = `graph TD
  A --> B
      C --> D`;
    expect(roundtrip(code)).toBe(code);
  });

  test('complex flowchart', () => {
    const code = `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great]
    B -->|No| D[Debug]
    D --> E((Fix))
    E --> B
    %% Loop back to check`;
    expect(roundtrip(code)).toBe(code);
  });

  test('node-only lines preserved', () => {
    const code = `graph TD
    A[Alpha]
    B[Beta]
    A --> B`;
    expect(roundtrip(code)).toBe(code);
  });
});

describe('Flowchart parser', () => {
  test('parses direction', () => {
    const ir = parseFlowchart('graph LR\n    A --> B');
    expect(ir.direction).toBe('LR');
  });

  test('parses nodes from edges', () => {
    const ir = parseFlowchart('graph TD\n    A --> B');
    expect(ir.nodes.has('A')).toBe(true);
    expect(ir.nodes.has('B')).toBe(true);
  });

  test('parses node labels', () => {
    const ir = parseFlowchart('graph TD\n    A[Hello World] --> B');
    const nodeA = ir.nodes.get('A');
    expect(nodeA?.label).toBe('Hello World');
    expect(nodeA?.shape).toBe('rectangle');
  });

  test('parses diamond shape', () => {
    const ir = parseFlowchart('graph TD\n    A{Decision}');
    const nodeA = ir.nodes.get('A');
    expect(nodeA?.label).toBe('Decision');
    expect(nodeA?.shape).toBe('rhombus');
  });

  test('parses edge labels', () => {
    const ir = parseFlowchart('graph TD\n    A -->|Yes| B');
    expect(ir.edges.length).toBe(1);
    expect(ir.edges[0].label).toBe('Yes');
  });

  test('parses multiple edges', () => {
    const ir = parseFlowchart('graph TD\n    A --> B\n    B --> C\n    A --> C');
    expect(ir.edges.length).toBe(3);
  });

  test('identifies line types correctly', () => {
    const ir = parseFlowchart(`graph TD
    %% comment
    A[Node] --> B
    style A fill:#f9f
    classDef cls fill:#0f0
    click A "url"
    subgraph sub1
    C --> D
    end`);

    const types = ir.lines.map((l) => l.type);
    expect(types).toContain('directive');
    expect(types).toContain('comment');
    expect(types).toContain('edge_def');
    expect(types).toContain('style');
    expect(types).toContain('class_def');
    expect(types).toContain('click');
    expect(types).toContain('subgraph_start');
    expect(types).toContain('subgraph_end');
  });
});

describe('Flowchart serializer with modifications', () => {
  test('modify node label', () => {
    const ir = parseFlowchart('graph TD\n    A[Start] --> B');
    ir.nodes.set('A', { ...ir.nodes.get('A')!, label: 'Begin' });
    const result = serializeFlowchart(ir, { modifiedNodes: new Set(['A']) });
    expect(result).toContain('A[Begin]');
  });

  test('remove node', () => {
    const code = `graph TD
    A[Start]
    B[End]
    A --> B`;
    const ir = parseFlowchart(code);
    const result = serializeFlowchart(ir, { removedNodes: new Set(['B']), removedEdges: new Set([0]) });
    expect(result).not.toContain('B[End]');
    expect(result).toContain('A[Start]');
  });

  test('add new node', () => {
    const code = `graph TD
    A --> B`;
    const ir = parseFlowchart(code);
    const result = serializeFlowchart(ir, {
      newNodes: [{ id: 'C', label: 'New', shape: 'rectangle', raw: '' }],
    });
    expect(result).toContain('C[New]');
  });

  test('add new edge', () => {
    const code = `graph TD
    A --> B`;
    const ir = parseFlowchart(code);
    const result = serializeFlowchart(ir, {
      newEdges: [{ sourceId: 'B', targetId: 'C', label: '', lineStyle: 'solid', arrowType: 'arrow', raw: '' }],
    });
    expect(result).toContain('B --> C');
  });
});
