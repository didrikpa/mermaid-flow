import { ClassIR, ClassRelation, ClassRelationType } from '../ir';

const RELATION_SYMBOLS: Record<ClassRelationType, string> = {
  inheritance: '<|--',
  composition: '*--',
  aggregation: 'o--',
  association: '-->',
  dependency: '..>',
  realization: '..|>',
  link: '--',
  dashed_link: '..',
};

function serializeRelation(r: ClassRelation): string {
  const symbol = RELATION_SYMBOLS[r.relationType] ?? '-->';
  if (r.label) {
    return `${r.classA} ${symbol} ${r.classB} : ${r.label}`;
  }
  return `${r.classA} ${symbol} ${r.classB}`;
}

export function serializeClass(ir: ClassIR, modified?: {
  modifiedRelations?: Set<number>;
  newRelations?: ClassRelation[];
  removedRelations?: Set<number>;
}): string {
  const result: string[] = [];
  let relIndex = 0;

  for (const line of ir.lines) {
    if (line.type === 'relation' && line.relation) {
      if (modified?.removedRelations?.has(relIndex)) {
        relIndex++;
        continue;
      }
      if (modified?.modifiedRelations?.has(relIndex)) {
        result.push(line.indent + serializeRelation(line.relation));
        relIndex++;
        continue;
      }
      relIndex++;
    }
    result.push(line.raw);
  }

  if (modified?.newRelations?.length) {
    for (const r of modified.newRelations) {
      result.push('    ' + serializeRelation(r));
    }
  }

  return result.join('\n');
}
