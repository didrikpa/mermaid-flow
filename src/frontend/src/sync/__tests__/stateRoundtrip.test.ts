import { describe, test, expect } from 'vitest';
import { parseState } from '../parsers/stateParser';
import { serializeState } from '../serializers/stateSerializer';

function roundtrip(code: string): string {
  const ir = parseState(code);
  return serializeState(ir);
}

describe('State roundtrip', () => {
  test('simple state diagram', () => {
    const code = `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : start
    Processing --> Done : complete
    Done --> [*]`;
    expect(roundtrip(code)).toBe(code);
  });

  test('state with label', () => {
    const code = `stateDiagram-v2
    state "Waiting for Input" as waiting
    [*] --> waiting`;
    expect(roundtrip(code)).toBe(code);
  });

  test('comments preserved', () => {
    const code = `stateDiagram-v2
    %% Initial state
    [*] --> S1`;
    expect(roundtrip(code)).toBe(code);
  });

  test('empty lines preserved', () => {
    const code = `stateDiagram-v2

    [*] --> S1

    S1 --> S2`;
    expect(roundtrip(code)).toBe(code);
  });
});

describe('State parser', () => {
  test('parses states from transitions', () => {
    const ir = parseState('stateDiagram-v2\n    [*] --> Idle\n    Idle --> Done');
    expect(ir.states.has('[*]')).toBe(true);
    expect(ir.states.has('Idle')).toBe(true);
    expect(ir.states.has('Done')).toBe(true);
  });

  test('parses transition labels', () => {
    const ir = parseState('stateDiagram-v2\n    A --> B : trigger');
    expect(ir.transitions.length).toBe(1);
    expect(ir.transitions[0].label).toBe('trigger');
  });

  test('marks start and end states', () => {
    const ir = parseState('stateDiagram-v2\n    [*] --> S1\n    S1 --> [*]');
    const star = ir.states.get('[*]')!;
    expect(star.isStart).toBe(true);
    expect(star.isEnd).toBe(true);
  });
});
