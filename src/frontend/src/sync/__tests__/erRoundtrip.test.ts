import { describe, test, expect } from 'vitest';
import { parseER } from '../parsers/erParser';
import { serializeER } from '../serializers/erSerializer';

function roundtrip(code: string): string {
  const ir = parseER(code);
  return serializeER(ir);
}

describe('ER roundtrip', () => {
  test('simple ER diagram', () => {
    const code = `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains`;
    expect(roundtrip(code)).toBe(code);
  });

  test('quoted labels', () => {
    const code = `erDiagram
    PRODUCT ||--o{ LINE_ITEM : "is in"`;
    expect(roundtrip(code)).toBe(code);
  });

  test('comments preserved', () => {
    const code = `erDiagram
    %% Main entities
    USER ||--o{ ORDER : places`;
    expect(roundtrip(code)).toBe(code);
  });

  test('empty lines preserved', () => {
    const code = `erDiagram

    USER ||--o{ ORDER : places

    ORDER ||--|{ ITEM : has`;
    expect(roundtrip(code)).toBe(code);
  });
});

describe('ER parser', () => {
  test('parses entities from relationships', () => {
    const ir = parseER('erDiagram\n    USER ||--o{ ORDER : places');
    expect(ir.entities.has('USER')).toBe(true);
    expect(ir.entities.has('ORDER')).toBe(true);
  });

  test('parses cardinality', () => {
    const ir = parseER('erDiagram\n    USER ||--o{ ORDER : places');
    expect(ir.relationships[0].cardA).toBe('||');
    expect(ir.relationships[0].cardB).toBe('o{');
  });

  test('parses relationship label', () => {
    const ir = parseER('erDiagram\n    A ||--|{ B : "has many"');
    expect(ir.relationships[0].label).toBe('has many');
  });
});
