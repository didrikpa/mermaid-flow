import {
  SequenceIR,
  SequenceLine,
  SequenceParticipant,
  SequenceMessage,
  SequenceNote,
  SequenceArrowType,
  SequenceNotePosition,
  SequenceBlockType,
} from '../ir';

const ARROW_PATTERNS: Array<{ pattern: string; type: SequenceArrowType }> = [
  { pattern: '-->>',  type: 'dashed' },
  { pattern: '-->',   type: 'dashed_open' },
  { pattern: '--x',   type: 'dashed_cross' },
  { pattern: '--)',   type: 'dashed_async' },
  { pattern: '->>',   type: 'solid' },
  { pattern: '->',    type: 'solid_open' },
  { pattern: '-x',    type: 'cross' },
  { pattern: '-)',    type: 'async' },
];

const BLOCK_TYPES: SequenceBlockType[] = ['loop', 'alt', 'else', 'opt', 'par', 'and', 'critical', 'break', 'rect'];

export function parseSequence(code: string): SequenceIR {
  const rawLines = code.split('\n');
  const lines: SequenceLine[] = [];
  const participants: SequenceParticipant[] = [];
  const messages: SequenceMessage[] = [];
  const notes: SequenceNote[] = [];
  let headerRaw = '';
  const participantIds = new Set<string>();

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const indent = rawLine.match(/^(\s*)/)?.[1] ?? '';
    const trimmed = rawLine.trim();

    // Empty
    if (!trimmed) {
      lines.push({ type: 'empty', raw: rawLine, indent });
      continue;
    }

    // Header
    if (trimmed === 'sequenceDiagram') {
      headerRaw = rawLine;
      lines.push({ type: 'directive', raw: rawLine, indent });
      continue;
    }

    // Comments
    if (trimmed.startsWith('%%')) {
      lines.push({ type: 'comment', raw: rawLine, indent });
      continue;
    }

    // Participant / actor
    const participantMatch = trimmed.match(/^(participant|actor)\s+(\S+?)(?:\s+as\s+(.+))?$/);
    if (participantMatch) {
      const p: SequenceParticipant = {
        id: participantMatch[2],
        alias: participantMatch[3] || participantMatch[2],
        type: participantMatch[1] as 'participant' | 'actor',
        raw: rawLine,
      };
      participants.push(p);
      participantIds.add(p.id);
      lines.push({ type: 'participant', raw: rawLine, indent, participant: p });
      continue;
    }

    // Note
    const noteMatch = trimmed.match(/^[Nn]ote\s+(left of|right of|over)\s+([^:]+):\s*(.+)$/);
    if (noteMatch) {
      const note: SequenceNote = {
        position: noteMatch[1] as SequenceNotePosition,
        participants: noteMatch[2].split(',').map(s => s.trim()),
        text: noteMatch[3],
        raw: rawLine,
      };
      notes.push(note);
      lines.push({ type: 'note', raw: rawLine, indent, note });
      continue;
    }

    // Activate / deactivate
    const activationMatch = trimmed.match(/^(activate|deactivate)\s+(\S+)$/);
    if (activationMatch) {
      lines.push({
        type: 'activation',
        raw: rawLine,
        indent,
        activation: {
          action: activationMatch[1] as 'activate' | 'deactivate',
          participant: activationMatch[2],
          raw: rawLine,
        },
      });
      continue;
    }

    // Block start (loop, alt, opt, par, critical, break, rect)
    const blockMatch = trimmed.match(new RegExp(`^(${BLOCK_TYPES.join('|')})(?:\\s+(.*))?$`));
    if (blockMatch) {
      lines.push({
        type: 'block_start',
        raw: rawLine,
        indent,
        block: {
          blockType: blockMatch[1] as SequenceBlockType,
          label: blockMatch[2] || '',
          raw: rawLine,
        },
      });
      continue;
    }

    // Block end
    if (trimmed === 'end') {
      lines.push({ type: 'block_end', raw: rawLine, indent });
      continue;
    }

    // Messages: A->>B: text or A->>+B: text (with activation shorthand)
    let foundMessage = false;
    for (const { pattern, type } of ARROW_PATTERNS) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const msgRegex = new RegExp(`^(\\S+?)\\s*${escaped}\\+?\\s*(\\S+?)\\s*:\\s*(.+)$`);
      const msgMatch = trimmed.match(msgRegex);
      if (msgMatch) {
        const msg: SequenceMessage = {
          from: msgMatch[1],
          to: msgMatch[2],
          arrowType: type,
          text: msgMatch[3],
          raw: rawLine,
        };
        messages.push(msg);

        // Auto-register participants
        if (!participantIds.has(msg.from)) {
          participants.push({ id: msg.from, alias: msg.from, type: 'participant', raw: '' });
          participantIds.add(msg.from);
        }
        if (!participantIds.has(msg.to)) {
          participants.push({ id: msg.to, alias: msg.to, type: 'participant', raw: '' });
          participantIds.add(msg.to);
        }

        lines.push({ type: 'message', raw: rawLine, indent, message: msg });
        foundMessage = true;
        break;
      }
    }
    if (foundMessage) continue;

    // Unknown
    lines.push({ type: 'unknown', raw: rawLine, indent });
  }

  return { headerRaw, lines, participants, messages, notes };
}
