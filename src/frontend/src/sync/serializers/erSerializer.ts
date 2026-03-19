import { ERIR, ERRelationship } from '../ir';

function serializeRelationship(r: ERRelationship): string {
  const label = r.label.includes(' ') ? `"${r.label}"` : r.label;
  return `${r.entityA} ${r.cardA}--${r.cardB} ${r.entityB} : ${label}`;
}

export function serializeER(ir: ERIR, modified?: {
  modifiedRelationships?: Set<number>;
  newRelationships?: ERRelationship[];
  removedRelationships?: Set<number>;
}): string {
  const result: string[] = [];
  let relIndex = 0;

  for (const line of ir.lines) {
    if (line.type === 'relationship' && line.relationship) {
      if (modified?.removedRelationships?.has(relIndex)) {
        relIndex++;
        continue;
      }
      if (modified?.modifiedRelationships?.has(relIndex)) {
        result.push(line.indent + serializeRelationship(line.relationship));
        relIndex++;
        continue;
      }
      relIndex++;
    }
    result.push(line.raw);
  }

  if (modified?.newRelationships?.length) {
    for (const r of modified.newRelationships) {
      result.push('    ' + serializeRelationship(r));
    }
  }

  return result.join('\n');
}
