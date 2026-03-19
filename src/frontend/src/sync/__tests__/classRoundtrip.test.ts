import { describe, test, expect } from 'vitest';
import { parseClass } from '../parsers/classParser';
import { serializeClass } from '../serializers/classSerializer';

function roundtrip(code: string): string {
  const ir = parseClass(code);
  return serializeClass(ir);
}

describe('Class roundtrip', () => {
  test('simple class diagram', () => {
    const code = `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }`;
    expect(roundtrip(code)).toBe(code);
  });

  test('inheritance relationship', () => {
    const code = `classDiagram
    Animal <|-- Dog`;
    expect(roundtrip(code)).toBe(code);
  });

  test('multiple relationships', () => {
    const code = `classDiagram
    Animal <|-- Dog
    Animal <|-- Cat
    Animal *-- Leg`;
    expect(roundtrip(code)).toBe(code);
  });

  test('relationship with label', () => {
    const code = `classDiagram
    ClassA --> ClassB : uses`;
    expect(roundtrip(code)).toBe(code);
  });

  test('comments preserved', () => {
    const code = `classDiagram
    %% Class hierarchy
    Animal <|-- Dog`;
    expect(roundtrip(code)).toBe(code);
  });

  test('empty lines preserved', () => {
    const code = `classDiagram

    Animal <|-- Dog

    Animal <|-- Cat`;
    expect(roundtrip(code)).toBe(code);
  });
});

describe('Class parser', () => {
  test('parses class members', () => {
    const ir = parseClass('classDiagram\n    class Foo {\n        +String name\n        -getId()\n    }');
    const foo = ir.classes.get('Foo');
    expect(foo).toBeDefined();
    expect(foo!.members.length).toBe(2);
    expect(foo!.members[0].visibility).toBe('+');
    expect(foo!.members[0].type).toBe('String');
    expect(foo!.members[0].name).toBe('name');
    expect(foo!.members[1].isMethod).toBe(true);
  });

  test('parses relationship types', () => {
    const ir = parseClass('classDiagram\n    A <|-- B\n    C *-- D\n    E ..> F');
    expect(ir.relations.length).toBe(3);
    expect(ir.relations[0].relationType).toBe('inheritance');
    expect(ir.relations[1].relationType).toBe('composition');
    expect(ir.relations[2].relationType).toBe('dependency');
  });

  test('registers classes from relationships', () => {
    const ir = parseClass('classDiagram\n    Foo --> Bar');
    expect(ir.classes.has('Foo')).toBe(true);
    expect(ir.classes.has('Bar')).toBe(true);
  });
});
