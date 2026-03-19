import React from 'react';
import { useDiagramStore } from '../hooks/useDiagramStore';
import { useForgeStorage } from '../hooks/useForgeStorage';
import { DiagramTypePicker } from './DiagramTypePicker';
import { EditMode } from './EditMode';
import { ViewMode } from './ViewMode';

interface MacroShellProps {
  localId: string;
  isEditing: boolean;
}

export const MacroShell: React.FC<MacroShellProps> = ({ localId, isEditing }) => {
  const { diagramType, code, isLoading, error, isSaving } = useDiagramStore();
  const { initializeWithType } = useForgeStorage(localId);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        color: '#6b778c',
        fontSize: 14,
      }}>
        Loading diagram...
      </div>
    );
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
    return <ViewMode code={code} />;
  }

  // Edit mode — full editor
  return (
    <div style={{ position: 'relative' }}>
      <EditMode />
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
