import {
  FlowchartIR, SequenceIR, StateIR, ERIR, ClassIR,
  IRNode, IREdge, StateNode, StateTransition, ERRelationship, ClassRelation,
} from './ir';
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

/**
 * Translate graph-editor updates (IRNode/IREdge-based) into the native
 * format expected by each diagram type's serializer, and apply changes
 * to the IR in-place.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function translateUpdates(diagramType: string, ir: DiagramIR, updates: Record<string, any>): Record<string, any> {
  if (diagramType === 'flowchart') {
    // Flowchart: apply modifiedNodes to the IR in-place
    const flowIR = ir as FlowchartIR;
    if (updates.modifiedNodes) {
      for (const [id, node] of updates.modifiedNodes as Map<string, IRNode>) {
        flowIR.nodes.set(id, node);
      }
    }
    if (updates.removedNodes) {
      for (const id of updates.removedNodes as Set<string>) {
        flowIR.nodes.delete(id);
      }
    }
    // Convert Maps/Sets to the format the flowchart serializer expects
    return {
      modifiedNodes: updates.modifiedNodes ? new Set((updates.modifiedNodes as Map<string, IRNode>).keys()) : undefined,
      modifiedEdges: updates.modifiedEdges ? new Set((updates.modifiedEdges as Map<number, IREdge>).keys()) : undefined,
      newNodes: updates.newNodes,
      newEdges: updates.newEdges,
      removedNodes: updates.removedNodes,
      removedEdges: updates.removedEdges,
    };
  }

  if (diagramType === 'state') {
    const stateIR = ir as StateIR;
    const modifiedNodes = updates.modifiedNodes as Map<string, IRNode> | undefined;
    const removedNodes = updates.removedNodes as Set<string> | undefined;
    const newNodes = updates.newNodes as IRNode[] | undefined;
    const modifiedEdges = updates.modifiedEdges as Map<number, IREdge> | undefined;
    const newEdges = updates.newEdges as IREdge[] | undefined;
    const removedEdges = updates.removedEdges as Set<number> | undefined;

    // Apply label changes to state nodes in IR
    const modifiedStates = new Set<string>();
    if (modifiedNodes) {
      for (const [id, irNode] of modifiedNodes) {
        const state = stateIR.states.get(id);
        if (state && state.label !== irNode.label) {
          state.label = irNode.label;
          modifiedStates.add(id);
          // Also update the line reference
          for (const line of stateIR.lines) {
            if (line.state && line.state.id === id) {
              line.state.label = irNode.label;
            }
          }
        }
      }
    }

    // Map split [*]_start / [*]_end IDs back to [*]
    const unstar = (id: string) => (id === '[*]_start' || id === '[*]_end') ? '[*]' : id;

    // Apply transition changes
    const modifiedTransitions = new Set<number>();
    if (modifiedEdges) {
      for (const [idx, irEdge] of modifiedEdges) {
        if (idx < stateIR.transitions.length) {
          stateIR.transitions[idx] = {
            ...stateIR.transitions[idx],
            from: unstar(irEdge.sourceId),
            to: unstar(irEdge.targetId),
            label: irEdge.label,
          };
          modifiedTransitions.add(idx);
        }
      }
    }

    // Convert new nodes to StateNode format (skip visual-only start/end splits)
    const newStates: StateNode[] | undefined = newNodes
      ?.filter(n => n.id !== '[*]_start' && n.id !== '[*]_end')
      .map(n => ({
        id: n.id,
        label: n.label,
        isStart: n.id === '[*]',
        isEnd: false,
        raw: '',
      }));

    // Convert new edges to StateTransition format
    const newTransitions: StateTransition[] | undefined = newEdges?.map(e => ({
      from: unstar(e.sourceId),
      to: unstar(e.targetId),
      label: e.label,
      raw: '',
    }));

    return {
      modifiedStates: modifiedStates.size > 0 ? modifiedStates : undefined,
      modifiedTransitions: modifiedTransitions.size > 0 ? modifiedTransitions : undefined,
      newStates,
      newTransitions,
      removedStates: removedNodes ? new Set([...removedNodes].map(unstar)) : undefined,
      removedTransitions: removedEdges,
    };
  }

  if (diagramType === 'er') {
    const erIR = ir as ERIR;
    const modifiedEdges = updates.modifiedEdges as Map<number, IREdge> | undefined;
    const newEdges = updates.newEdges as IREdge[] | undefined;
    const removedEdges = updates.removedEdges as Set<number> | undefined;

    // Apply relationship changes
    const modifiedRelationships = new Set<number>();
    if (modifiedEdges) {
      for (const [idx, irEdge] of modifiedEdges) {
        if (idx < erIR.relationships.length) {
          erIR.relationships[idx] = {
            ...erIR.relationships[idx],
            entityA: irEdge.sourceId,
            entityB: irEdge.targetId,
            label: irEdge.label,
          };
          modifiedRelationships.add(idx);
        }
      }
    }

    const newRelationships: ERRelationship[] | undefined = newEdges?.map(e => ({
      entityA: e.sourceId,
      cardA: '||',
      cardB: 'o{',
      entityB: e.targetId,
      label: e.label || 'relates',
      raw: '',
    }));

    return {
      modifiedRelationships: modifiedRelationships.size > 0 ? modifiedRelationships : undefined,
      newRelationships,
      removedRelationships: removedEdges,
    };
  }

  if (diagramType === 'class') {
    const classIR = ir as ClassIR;
    const modifiedEdges = updates.modifiedEdges as Map<number, IREdge> | undefined;
    const newEdges = updates.newEdges as IREdge[] | undefined;
    const removedEdges = updates.removedEdges as Set<number> | undefined;

    // Apply relation changes
    const modifiedRelations = new Set<number>();
    if (modifiedEdges) {
      for (const [idx, irEdge] of modifiedEdges) {
        if (idx < classIR.relations.length) {
          classIR.relations[idx] = {
            ...classIR.relations[idx],
            classA: irEdge.sourceId,
            classB: irEdge.targetId,
            label: irEdge.label,
          };
          modifiedRelations.add(idx);
        }
      }
    }

    const newRelations: ClassRelation[] | undefined = newEdges?.map(e => ({
      classA: e.sourceId,
      classB: e.targetId,
      relationType: 'association' as const,
      label: e.label || '',
      raw: '',
    }));

    return {
      modifiedRelations: modifiedRelations.size > 0 ? modifiedRelations : undefined,
      newRelations,
      removedRelations: removedEdges,
    };
  }

  return updates;
}

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

      // Apply participant modifications for sequence IR
      if (this.diagramType === 'sequence' && updates.modifiedParticipants) {
        const seqIR = this.ir as SequenceIR;
        for (const [id, p] of updates.modifiedParticipants) {
          const idx = seqIR.participants.findIndex((pp: { id: string }) => pp.id === id);
          if (idx >= 0) seqIR.participants[idx] = p;
        }
      }

      // Translate graph-editor updates to native serializer format
      const translated = translateUpdates(this.diagramType, this.ir, updates);
      const code = serializer(this.ir, translated);
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
