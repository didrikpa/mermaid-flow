import { FlowchartIR, IRNode, IREdge } from './ir';
import { parseFlowchart } from './parsers/flowchartParser';
import { serializeFlowchart } from './serializers/flowchartSerializer';

export type SyncOrigin = 'code' | 'visual';

export interface SyncState {
  ir: FlowchartIR;
  syncVersion: number;
}

export class SyncEngine {
  private ir: FlowchartIR | null = null;
  private syncVersion = 0;
  private lastOrigin: SyncOrigin | null = null;
  private codeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private visualDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private onCodeUpdate: ((code: string) => void) | null = null;
  private onIRUpdate: ((ir: FlowchartIR) => void) | null = null;

  private debounceMs: number;

  constructor(debounceMs = 300) {
    this.debounceMs = debounceMs;
  }

  setCallbacks(onCodeUpdate: (code: string) => void, onIRUpdate: (ir: FlowchartIR) => void) {
    this.onCodeUpdate = onCodeUpdate;
    this.onIRUpdate = onIRUpdate;
  }

  getIR(): FlowchartIR | null {
    return this.ir;
  }

  getSyncVersion(): number {
    return this.syncVersion;
  }

  /** Called when code editor changes */
  handleCodeChange(code: string) {
    if (this.lastOrigin === 'visual') {
      // Skip echo from visual → code → visual loop
      this.lastOrigin = null;
      return;
    }

    if (this.codeDebounceTimer) {
      clearTimeout(this.codeDebounceTimer);
    }

    this.codeDebounceTimer = setTimeout(() => {
      this.lastOrigin = 'code';
      this.syncVersion++;
      this.ir = parseFlowchart(code);
      this.onIRUpdate?.(this.ir);
    }, this.debounceMs);
  }

  /** Called when visual editor changes */
  handleVisualChange(updates: {
    modifiedNodes?: Map<string, IRNode>;
    modifiedEdges?: Map<number, IREdge>;
    newNodes?: IRNode[];
    newEdges?: IREdge[];
    removedNodes?: Set<string>;
    removedEdges?: Set<number>;
  }) {
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

      this.lastOrigin = 'visual';
      this.syncVersion++;

      // Apply modifications to IR
      if (updates.modifiedNodes) {
        for (const [id, node] of updates.modifiedNodes) {
          this.ir.nodes.set(id, node);
        }
      }

      if (updates.removedNodes) {
        for (const id of updates.removedNodes) {
          this.ir.nodes.delete(id);
        }
      }

      // Serialize IR back to code
      const code = serializeFlowchart(this.ir, {
        modifiedNodes: updates.modifiedNodes ? new Set(updates.modifiedNodes.keys()) : undefined,
        modifiedEdges: updates.modifiedEdges ? new Set(updates.modifiedEdges.keys()) : undefined,
        newNodes: updates.newNodes,
        newEdges: updates.newEdges,
        removedNodes: updates.removedNodes,
        removedEdges: updates.removedEdges,
      });

      this.onCodeUpdate?.(code);
    }, this.debounceMs);
  }

  /** Initialize from code (on load) */
  initFromCode(code: string) {
    this.ir = parseFlowchart(code);
    this.syncVersion++;
    this.lastOrigin = null;
    return this.ir;
  }

  destroy() {
    if (this.codeDebounceTimer) clearTimeout(this.codeDebounceTimer);
    if (this.visualDebounceTimer) clearTimeout(this.visualDebounceTimer);
  }
}
