import { create } from 'zustand';
import { DiagramType } from '../types/diagram';

export type EditOrigin = 'code' | 'visual' | 'load';

const MAX_HISTORY = 100;

interface DiagramState {
  localId: string | null;
  diagramType: DiagramType | null;
  code: string;
  lastEditOrigin: EditOrigin;
  syncVersion: number;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  isDirty: boolean;

  // Undo/redo history
  undoStack: string[];
  redoStack: string[];

  setLocalId: (id: string) => void;
  setDiagramType: (type: DiagramType | null) => void;
  setCode: (code: string, origin: EditOrigin) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  setDirty: (dirty: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reset: () => void;
}

const initialState = {
  localId: null,
  diagramType: null,
  code: '',
  lastEditOrigin: 'load' as EditOrigin,
  syncVersion: 0,
  isLoading: true,
  isSaving: false,
  error: null,
  isDirty: false,
  undoStack: [] as string[],
  redoStack: [] as string[],
};

export const useDiagramStore = create<DiagramState>((set, get) => ({
  ...initialState,

  setLocalId: (id) => set({ localId: id }),

  setDiagramType: (type) => set({ diagramType: type }),

  setCode: (code, origin) =>
    set((state) => {
      // Only push to undo stack for user-initiated edits (not loads)
      const undoStack = origin !== 'load' && state.code !== code
        ? [...state.undoStack.slice(-(MAX_HISTORY - 1)), state.code]
        : state.undoStack;
      return {
        code,
        lastEditOrigin: origin,
        syncVersion: state.syncVersion + 1,
        isDirty: true,
        undoStack,
        // Clear redo stack on new edits
        redoStack: origin !== 'load' ? [] : state.redoStack,
      };
    }),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return state;
      const undoStack = [...state.undoStack];
      const previousCode = undoStack.pop()!;
      return {
        code: previousCode,
        lastEditOrigin: 'code' as EditOrigin,
        syncVersion: state.syncVersion + 1,
        undoStack,
        redoStack: [...state.redoStack, state.code],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return state;
      const redoStack = [...state.redoStack];
      const nextCode = redoStack.pop()!;
      return {
        code: nextCode,
        lastEditOrigin: 'code' as EditOrigin,
        syncVersion: state.syncVersion + 1,
        undoStack: [...state.undoStack, state.code],
        redoStack,
      };
    }),

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),
  setError: (error) => set({ error }),
  setDirty: (isDirty) => set({ isDirty }),
  reset: () => set(initialState),
}));
