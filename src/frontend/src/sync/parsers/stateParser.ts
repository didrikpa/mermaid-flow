import {
  StateIR,
  StateLine,
  StateNode,
  StateTransition,
} from '../ir';

export function parseState(code: string): StateIR {
  const rawLines = code.split('\n');
  const lines: StateLine[] = [];
  const states = new Map<string, StateNode>();
  const transitions: StateTransition[] = [];
  let headerRaw = '';

  function ensureState(id: string, raw: string) {
    if (!states.has(id)) {
      states.set(id, {
        id,
        label: id,
        isStart: id === '[*]',
        isEnd: false,
        raw,
      });
    }
  }

  for (const rawLine of rawLines) {
    const indent = rawLine.match(/^(\s*)/)?.[1] ?? '';
    const trimmed = rawLine.trim();

    if (!trimmed) {
      lines.push({ type: 'empty', raw: rawLine, indent });
      continue;
    }

    // Header
    if (trimmed.match(/^stateDiagram(-v2)?$/)) {
      headerRaw = rawLine;
      lines.push({ type: 'directive', raw: rawLine, indent });
      continue;
    }

    // Comments
    if (trimmed.startsWith('%%')) {
      lines.push({ type: 'comment', raw: rawLine, indent });
      continue;
    }

    // Note
    if (trimmed.match(/^note\s+/i)) {
      lines.push({ type: 'note', raw: rawLine, indent });
      continue;
    }

    // State definition: state "label" as id
    const stateDefMatch = trimmed.match(/^state\s+"([^"]+)"\s+as\s+(\S+)/);
    if (stateDefMatch) {
      const node: StateNode = {
        id: stateDefMatch[2],
        label: stateDefMatch[1],
        isStart: false,
        isEnd: false,
        raw: rawLine,
      };
      states.set(node.id, node);
      lines.push({ type: 'state_def', raw: rawLine, indent, state: node });
      continue;
    }

    // Transition: A --> B : label
    const transMatch = trimmed.match(/^(\[?\*?\]?\S*)\s*-->\s*(\[?\*?\]?\S*)(?:\s*:\s*(.+))?$/);
    if (transMatch) {
      const from = transMatch[1];
      const to = transMatch[2];
      ensureState(from, rawLine);
      ensureState(to, rawLine);

      // Mark [*] as end when it's a target
      if (to === '[*]') {
        const s = states.get(to)!;
        s.isEnd = true;
      }

      const t: StateTransition = {
        from,
        to,
        label: transMatch[3] || '',
        raw: rawLine,
      };
      transitions.push(t);
      lines.push({ type: 'transition', raw: rawLine, indent, transition: t });
      continue;
    }

    // Unknown
    lines.push({ type: 'unknown', raw: rawLine, indent });
  }

  return { headerRaw, lines, states, transitions };
}
