import { StateIR, StateNode, StateTransition } from '../ir';

function serializeTransition(t: StateTransition): string {
  if (t.label) {
    return `${t.from} --> ${t.to} : ${t.label}`;
  }
  return `${t.from} --> ${t.to}`;
}

function serializeStateDef(state: StateNode, indent: string): string {
  // [*] nodes don't need a state definition line
  if (state.id === '[*]') return '';
  if (state.label !== state.id) {
    return `${indent}state "${state.label}" as ${state.id}`;
  }
  return `${indent}${state.id}`;
}

export function serializeState(ir: StateIR, modified?: {
  modifiedStates?: Set<string>;
  modifiedTransitions?: Set<number>;
  newStates?: StateNode[];
  newTransitions?: StateTransition[];
  removedStates?: Set<string>;
  removedTransitions?: Set<number>;
}): string {
  const result: string[] = [];
  let transIndex = 0;

  for (const line of ir.lines) {
    if (line.type === 'state_def' && line.state && modified?.removedStates?.has(line.state.id)) {
      continue;
    }

    if (line.type === 'transition' && line.transition) {
      if (modified?.removedTransitions?.has(transIndex)) {
        transIndex++;
        continue;
      }
    }

    if (line.type === 'state_def' && line.state && modified?.modifiedStates?.has(line.state.id)) {
      const serialized = serializeStateDef(line.state, line.indent);
      if (serialized) result.push(serialized);
      continue;
    }

    if (line.type === 'transition' && line.transition && modified?.modifiedTransitions?.has(transIndex)) {
      result.push(line.indent + serializeTransition(line.transition));
      transIndex++;
    } else {
      result.push(line.raw);
      if (line.type === 'transition') transIndex++;
    }
  }

  if (modified?.newStates?.length) {
    for (const s of modified.newStates) {
      if (s.label !== s.id) {
        result.push(`    state "${s.label}" as ${s.id}`);
      }
    }
  }

  if (modified?.newTransitions?.length) {
    for (const t of modified.newTransitions) {
      result.push('    ' + serializeTransition(t));
    }
  }

  return result.join('\n');
}
