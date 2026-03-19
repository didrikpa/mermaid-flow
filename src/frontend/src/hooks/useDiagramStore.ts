import { create } from 'zustand';
import { DiagramType } from '../types/diagram';

export type EditOrigin = 'code' | 'visual' | 'load';

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

  setLocalId: (id: string) => void;
  setDiagramType: (type: DiagramType | null) => void;
  setCode: (code: string, origin: EditOrigin) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  setDirty: (dirty: boolean) => void;
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
};

export const useDiagramStore = create<DiagramState>((set) => ({
  ...initialState,

  setLocalId: (id) => set({ localId: id }),

  setDiagramType: (type) => set({ diagramType: type }),

  setCode: (code, origin) =>
    set((state) => ({
      code,
      lastEditOrigin: origin,
      syncVersion: state.syncVersion + 1,
      isDirty: true,
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),
  setError: (error) => set({ error }),
  setDirty: (isDirty) => set({ isDirty }),
  reset: () => set(initialState),
}));
