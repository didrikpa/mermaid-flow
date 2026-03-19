import { describe, test, expect } from 'vitest';
import { parseSequence } from '../parsers/sequenceParser';
import { serializeSequence } from '../serializers/sequenceSerializer';

function roundtrip(code: string): string {
  const ir = parseSequence(code);
  return serializeSequence(ir);
}

describe('Sequence roundtrip', () => {
  test('simple sequence', () => {
    const code = `sequenceDiagram
    A->>B: Hello`;
    expect(roundtrip(code)).toBe(code);
  });

  test('participants with aliases', () => {
    const code = `sequenceDiagram
    participant A as Service A
    participant B as Service B
    A->>B: Request
    B-->>A: Response`;
    expect(roundtrip(code)).toBe(code);
  });

  test('actors', () => {
    const code = `sequenceDiagram
    actor U as User
    participant S as Server
    U->>S: Login`;
    expect(roundtrip(code)).toBe(code);
  });

  test('all arrow types', () => {
    const code = `sequenceDiagram
    A->>B: solid
    A->B: solid open
    A-->>B: dashed
    A-->B: dashed open
    A-xB: cross
    A--xB: dashed cross
    A-)B: async
    A--)B: dashed async`;
    expect(roundtrip(code)).toBe(code);
  });

  test('notes', () => {
    const code = `sequenceDiagram
    A->>B: Hello
    Note right of B: Thinking
    Note over A,B: Shared note`;
    expect(roundtrip(code)).toBe(code);
  });

  test('activation', () => {
    const code = `sequenceDiagram
    A->>B: Request
    activate B
    B-->>A: Response
    deactivate B`;
    expect(roundtrip(code)).toBe(code);
  });

  test('blocks', () => {
    const code = `sequenceDiagram
    A->>B: Request
    loop Every minute
    B->>A: Ping
    end`;
    expect(roundtrip(code)).toBe(code);
  });

  test('alt/else blocks', () => {
    const code = `sequenceDiagram
    A->>B: Request
    alt Success
    B->>A: 200 OK
    else Failure
    B->>A: 500 Error
    end`;
    expect(roundtrip(code)).toBe(code);
  });

  test('comments preserved', () => {
    const code = `sequenceDiagram
    %% This is a comment
    A->>B: Hello`;
    expect(roundtrip(code)).toBe(code);
  });

  test('empty lines preserved', () => {
    const code = `sequenceDiagram

    A->>B: Hello

    B-->>A: World`;
    expect(roundtrip(code)).toBe(code);
  });
});

describe('Sequence parser', () => {
  test('parses participants', () => {
    const ir = parseSequence('sequenceDiagram\n    participant A as Alice');
    expect(ir.participants.length).toBe(1);
    expect(ir.participants[0].id).toBe('A');
    expect(ir.participants[0].alias).toBe('Alice');
  });

  test('auto-registers participants from messages', () => {
    const ir = parseSequence('sequenceDiagram\n    X->>Y: hello');
    expect(ir.participants.length).toBe(2);
    expect(ir.participants[0].id).toBe('X');
    expect(ir.participants[1].id).toBe('Y');
  });

  test('parses message text', () => {
    const ir = parseSequence('sequenceDiagram\n    A->>B: Hello World');
    expect(ir.messages.length).toBe(1);
    expect(ir.messages[0].text).toBe('Hello World');
    expect(ir.messages[0].arrowType).toBe('solid');
  });

  test('parses notes', () => {
    const ir = parseSequence('sequenceDiagram\n    Note over A,B: shared');
    expect(ir.notes.length).toBe(1);
    expect(ir.notes[0].position).toBe('over');
    expect(ir.notes[0].participants).toEqual(['A', 'B']);
  });
});
