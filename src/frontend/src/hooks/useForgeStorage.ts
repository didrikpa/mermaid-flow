import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@forge/bridge';
import { useDiagramStore } from './useDiagramStore';
import { DiagramData, DiagramType, STARTER_TEMPLATES } from '../types/diagram';

const SAVE_DEBOUNCE_MS = 2000;

export function useForgeStorage(localId: string | null) {
  const {
    code,
    diagramType,
    isDirty,
    setCode,
    setDiagramType,
    setLoading,
    setSaving,
    setDirty,
    setError,
  } = useDiagramStore();

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Load diagram on mount
  useEffect(() => {
    if (!localId) return;

    let cancelled = false;
    setLoading(true);

    invoke<DiagramData | null>('getDiagram', { localId })
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setDiagramType(data.type as DiagramType);
          setCode(data.code, 'load');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(`Failed to load diagram: ${err.message}`);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [localId, setCode, setDiagramType, setError, setLoading]);

  // Auto-save with debounce
  useEffect(() => {
    if (!localId || !diagramType || !isDirty) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setSaving(true);

      invoke('saveDiagram', { localId, type: diagramType, code })
        .then(() => {
          if (!isMountedRef.current) return;
          setDirty(false);
          setSaving(false);
        })
        .catch((err) => {
          if (!isMountedRef.current) return;
          setError(`Failed to save: ${err.message}`);
          setSaving(false);
        });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [localId, diagramType, code, isDirty, setSaving, setDirty, setError]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Fire-and-forget final save
      if (localId && diagramType && isDirty) {
        invoke('saveDiagram', { localId, type: diagramType, code }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeWithType = useCallback(
    (type: DiagramType) => {
      setDiagramType(type);
      setCode(STARTER_TEMPLATES[type], 'load');
      setDirty(true);
    },
    [setCode, setDiagramType, setDirty]
  );

  return { initializeWithType };
}
