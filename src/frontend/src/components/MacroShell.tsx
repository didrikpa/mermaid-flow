import React, { Suspense, lazy } from 'react';
import { useDiagramStore } from '../hooks/useDiagramStore';
import { useForgeStorage } from '../hooks/useForgeStorage';
import { DiagramTypePicker } from './DiagramTypePicker';
import { ViewMode } from './ViewMode';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';

// Lazy-load EditMode — it pulls in CodeMirror, React Flow, and all sync code.
// View mode only needs mermaid.js (also lazy-loaded in DiagramRenderer).
const EditMode = lazy(() => import('./EditMode').then(m => ({ default: m.EditMode })));

interface MacroShellProps {
  localId: string;
  isEditing: boolean;
}

export const MacroShell: React.FC<MacroShellProps> = ({ localId, isEditing }) => {
  const { diagramType, code, isLoading, error, isSaving } = useDiagramStore();
  const { initializeWithType } = useForgeStorage(localId);

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
