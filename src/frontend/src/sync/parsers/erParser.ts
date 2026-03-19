import {
  ERIR,
  ERLine,
  EREntity,
  ERRelationship,
} from '../ir';

// ER relationship pattern: ENTITY1 ||--o{ ENTITY2 : "label"
const ER_REL_REGEX = /^(\S+)\s+([\|}o]+)--([\|{o]+)\s+(\S+)\s*:\s*"?([^"]*)"?$/;

export function parseER(code: string): ERIR {
  const rawLines = code.split('\n');
  const lines: ERLine[] = [];
  const entities = new Map<string, EREntity>();
  const relationships: ERRelationship[] = [];
  let headerRaw = '';

  function ensureEntity(name: string, raw: string) {
    if (!entities.has(name)) {
      entities.set(name, { name, raw });
    }
  }

  for (const rawLine of rawLines) {
    const indent = rawLine.match(/^(\s*)/)?.[1] ?? '';
    const trimmed = rawLine.trim();

    if (!trimmed) {
      lines.push({ type: 'empty', raw: rawLine, indent });
      continue;
    }

    if (trimmed === 'erDiagram') {
      headerRaw = rawLine;
      lines.push({ type: 'directive', raw: rawLine, indent });
      continue;
    }

    if (trimmed.startsWith('%%')) {
      lines.push({ type: 'comment', raw: rawLine, indent });
      continue;
    }

    // Relationship
    const relMatch = trimmed.match(ER_REL_REGEX);
    if (relMatch) {
      const entityA = relMatch[1];
      const cardA = relMatch[2];
      const cardB = relMatch[3];
      const entityB = relMatch[4];
      const label = relMatch[5].trim();

      ensureEntity(entityA, rawLine);
      ensureEntity(entityB, rawLine);

      const rel: ERRelationship = {
        entityA,
        cardA,
        cardB,
        entityB,
        label,
        raw: rawLine,
      };
      relationships.push(rel);
      lines.push({ type: 'relationship', raw: rawLine, indent, relationship: rel });
      continue;
    }

    // Standalone entity (just a name on a line, or entity with attributes block)
    const entityMatch = trimmed.match(/^([A-Z_]\w*)\s*\{?$/i);
    if (entityMatch && trimmed !== 'erDiagram') {
      const name = entityMatch[1];
      ensureEntity(name, rawLine);
      lines.push({ type: 'entity', raw: rawLine, indent, entity: entities.get(name)! });
      continue;
    }

    lines.push({ type: 'unknown', raw: rawLine, indent });
  }

  return { headerRaw, lines, entities, relationships };
}
