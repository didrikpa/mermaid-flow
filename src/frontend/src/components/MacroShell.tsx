import React, { Suspense, lazy, useCallback } from 'react';
import { useDiagramStore } from '../hooks/useDiagramStore';
import { useForgeStorage } from '../hooks/useForgeStorage';
import { DiagramTypePicker } from './DiagramTypePicker';
import { ViewMode } from './ViewMode';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';
import { DIAGRAM_LABELS } from '../types/diagram';

// Lazy-load EditMode — it pulls in CodeMirror, React Flow, and all sync code.
// View mode only needs mermaid.js (also lazy-loaded in DiagramRenderer).
const EditMode = lazy(() => import('./EditMode').then(m => ({ default: m.EditMode })));

interface MacroShellProps {
  localId: string;
  isEditing: boolean;
}

export const MacroShell: React.FC<MacroShellProps> = ({ localId, isEditing }) => {
  const { diagramType, code, isLoading, error, isSaving, setDiagramType, setCode } = useDiagramStore();
  const { initializeWithType } = useForgeStorage(localId);

  const handleChangeType = useCallback(() => {
    setDiagramType(null);
    setCode('', 'load');
  }, [setDiagramType, setCode]);

  if (isLoading) {
    return <LoadingSpinner message="Loading diagram..." />;
  }

  if (error) {
    return (
      <div style={{
        padding: 16,
        color: '#ae2a19',
        backgroundColor: '#ffedeb',
        borderRadius: 4,
        fontSize: 14,
      }}>
        {error}
      </div>
    );
  }

  // No diagram yet — show type picker
  if (!diagramType) {
    return <DiagramTypePicker onSelect={initializeWithType} />;
  }

  // View mode — render only
  if (!isEditing) {
    return (
      <ErrorBoundary>
        <ViewMode code={code} />
      </ErrorBoundary>
    );
  }

  // Edit mode — full editor (lazy-loaded)
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderBottom: '1px solid #ebecf0',
        background: '#fafbfc',
        borderRadius: '4px 4px 0 0',
      }}>
        <span style={{ fontSize: 13, color: '#42526e', fontWeight: 500 }}>
          {DIAGRAM_LABELS[diagramType]}
        </span>
        <button
          onClick={handleChangeType}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            color: '#42526e',
            background: '#fff',
            border: '1px solid #dfe1e6',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Change type
        </button>
      </div>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner message="Loading editor..." />}>
          <EditMode />
        </Suspense>
      </ErrorBoundary>
      {isSaving && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 4,
          fontSize: 11,
          color: '#6b778c',
          background: '#fff',
          padding: '2px 8px',
          borderRadius: 3,
          border: '1px solid #ebecf0',
        }}>
          Saving...
        </div>
      )}
    </div>
  );
};
