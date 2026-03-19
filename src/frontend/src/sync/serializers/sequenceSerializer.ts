import {
  SequenceIR,
  SequenceParticipant,
  SequenceMessage,
  SequenceArrowType,
} from '../ir';

const ARROW_SYMBOLS: Record<SequenceArrowType, string> = {
  solid: '->>',
  solid_open: '->',
  dashed: '-->>',
  dashed_open: '-->',
  cross: '-x',
  dashed_cross: '--x',
  async: '-)',
  dashed_async: '--)',
};

function serializeParticipant(p: SequenceParticipant): string {
  if (p.alias && p.alias !== p.id) {
    return `${p.type} ${p.id} as ${p.alias}`;
  }
  return `${p.type} ${p.id}`;
}

function serializeMessage(msg: SequenceMessage): string {
  const arrow = ARROW_SYMBOLS[msg.arrowType] ?? '->>';
  return `${msg.from}${arrow}${msg.to}: ${msg.text}`;
}

export function serializeSequence(ir: SequenceIR, modified?: {
  modifiedParticipants?: Set<string>;
  modifiedMessages?: Set<number>;
  newParticipants?: SequenceParticipant[];
  newMessages?: SequenceMessage[];
  removedParticipants?: Set<string>;
  removedMessages?: Set<number>;
  reorderedParticipants?: string[]; // ordered participant IDs
}): string {
  const result: string[] = [];
  let messageIndex = 0;

  for (const line of ir.lines) {
    // Skip removed participants
    if (line.type === 'participant' && line.participant &&
        modified?.removedParticipants?.has(line.participant.id)) {
      continue;
    }

    // Skip removed messages
    if (line.type === 'message' && line.message) {
      if (modified?.removedMessages?.has(messageIndex)) {
        messageIndex++;
        continue;
      }
    }

    // Modified participant
    if (line.type === 'participant' && line.participant &&
        modified?.modifiedParticipants?.has(line.participant.id)) {
      const updated = ir.participants.find(p => p.id === line.participant!.id);
      if (updated) {
        result.push(line.indent + serializeParticipant(updated));
      } else {
        result.push(line.raw);
      }
    }
    // Modified message
    else if (line.type === 'message' && line.message &&
             modified?.modifiedMessages?.has(messageIndex)) {
      result.push(line.indent + serializeMessage(line.message));
      messageIndex++;
    }
    // Unmodified — emit raw
    else {
      result.push(line.raw);
      if (line.type === 'message') messageIndex++;
    }
  }

  // Append new participants after header
  if (modified?.newParticipants?.length) {
    const headerIdx = result.findIndex(l => l.trim() === 'sequenceDiagram');
    const insertIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
    const newLines = modified.newParticipants.map(p => '    ' + serializeParticipant(p));
    result.splice(insertIdx, 0, ...newLines);
  }

  // Append new messages at the end
  if (modified?.newMessages?.length) {
    for (const msg of modified.newMessages) {
      result.push('    ' + serializeMessage(msg));
    }
  }

  return result.join('\n');
}
