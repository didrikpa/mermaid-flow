import { FlowchartIR, SequenceIR, StateIR, ERIR, ClassIR } from './ir';
import { parseFlowchart } from './parsers/flowchartParser';
import { serializeFlowchart } from './serializers/flowchartSerializer';
import { parseSequence } from './parsers/sequenceParser';
import { serializeSequence } from './serializers/sequenceSerializer';
import { parseState } from './parsers/stateParser';
import { serializeState } from './serializers/stateSerializer';
import { parseER } from './parsers/erParser';
import { serializeER } from './serializers/erSerializer';
import { parseClass } from './parsers/classParser';
import { serializeClass } from './serializers/classSerializer';

export type DiagramIR = FlowchartIR | SequenceIR | StateIR | ERIR | ClassIR;
export type SyncOrigin = 'code' | 'visual';

type ParseFn = (code: string) => DiagramIR;
type SerializeFn = (ir: DiagramIR, modifications?: Record<string, unknown>) => string;

const PARSERS: Record<string, ParseFn> = {
  flowchart: parseFlowchart,
  sequence: parseSequence as ParseFn,
  state: parseState as ParseFn,
  er: parseER as ParseFn,
  class: parseClass as ParseFn,
};

const SERIALIZERS: Record<string, SerializeFn> = {
  flowchart: serializeFlowchart as SerializeFn,
  sequence: serializeSequence as SerializeFn,
  state: serializeState as SerializeFn,
  er: serializeER as SerializeFn,
  class: serializeClass as SerializeFn,
};

export class SyncEngine {
  private ir: DiagramIR | null = null;
  private syncVersion = 0;
  private lastOrigin: SyncOrigin | null = null;
  private codeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private visualDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private onCodeUpdate: ((code: string) => void) | null = null;
  private onIRUpdate: ((ir: DiagramIR) => void) | null = null;
  private diagramType: string;
  private debounceMs: number;

  constructor(diagramType: string, debounceMs = 300) {
    this.diagramType = diagramType;
    this.debounceMs = debounceMs;
  }

  setCallbacks(onCodeUpdate: (code: string) => void, onIRUpdate: (ir: DiagramIR) => void) {
    this.onCodeUpdate = onCodeUpdate;
    this.onIRUpdate = onIRUpdate;
  }

  getIR(): DiagramIR | null {
    return this.ir;
  }

  getSyncVersion(): number {
    return this.syncVersion;
  }

  private get parser(): ParseFn | undefined {
    return PARSERS[this.diagramType];
  }

  private get serializer(): SerializeFn | undefined {
    return SERIALIZERS[this.diagramType];
  }

  handleCodeChange(code: string) {
    if (this.lastOrigin === 'visual') {
      this.lastOrigin = null;
      return;
    }

    if (this.codeDebounceTimer) {
      clearTimeout(this.codeDebounceTimer);
    }

    this.codeDebounceTimer = setTimeout(() => {
      const parser = this.parser;
      if (!parser) return;

      this.lastOrigin = 'code';
      this.syncVersion++;
      this.ir = parser(code);
      this.onIRUpdate?.(this.ir);
    }, this.debounceMs);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleVisualChange(updates: Record<string, any>) {
    if (!this.ir) return;

    if (this.lastOrigin === 'code') {
      this.lastOrigin = null;
      return;
    }

    if (this.visualDebounceTimer) {
      clearTimeout(this.visualDebounceTimer);
    }

    this.visualDebounceTimer = setTimeout(() => {
      if (!this.ir) return;
      const serializer = this.serializer;
      if (!serializer) return;

      this.lastOrigin = 'visual';
      this.syncVersion++;

      // Apply node modifications for flowchart IR
      if (this.diagramType === 'flowchart' && updates.modifiedNodes) {
        const flowIR = this.ir as FlowchartIR;
        for (const [id, node] of updates.modifiedNodes) {
          flowIR.nodes.set(id, node);
        }
        if (updates.removedNodes) {
          for (const id of updates.removedNodes) {
            flowIR.nodes.delete(id);
          }
        }
      }

      // Apply participant modifications for sequence IR
      if (this.diagramType === 'sequence' && updates.modifiedParticipants) {
        const seqIR = this.ir as SequenceIR;
        for (const [id, p] of updates.modifiedParticipants) {
          const idx = seqIR.participants.findIndex((pp: { id: string }) => pp.id === id);
          if (idx >= 0) seqIR.participants[idx] = p;
        }
      }

      const code = serializer(this.ir, updates);
      this.onCodeUpdate?.(code);
    }, this.debounceMs);
  }

  initFromCode(code: string): DiagramIR | null {
    const parser = this.parser;
    if (!parser) return null;

    this.ir = parser(code);
    this.syncVersion++;
    this.lastOrigin = null;
    return this.ir;
  }

  destroy() {
    if (this.codeDebounceTimer) clearTimeout(this.codeDebounceTimer);
    if (this.visualDebounceTimer) clearTimeout(this.visualDebounceTimer);
  }
}
