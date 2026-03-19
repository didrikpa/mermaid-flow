import React from 'react';
import { IRLine } from '../../sync/ir';

interface ReadOnlyOverlayProps {
  lines: IRLine[];
}

export const ReadOnlyOverlay: React.FC<ReadOnlyOverlayProps> = ({ lines }) => {
  const readOnlyLines = lines.filter(
    (l) => l.type === 'style' || l.type === 'class_def' || l.type === 'class_assign' || l.type === 'click' || l.type === 'unknown'
  );

  if (readOnlyLines.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 8,
      left: 8,
      background: '#fffae6',
      border: '1px solid #ffe380',
      borderRadius: 4,
      padding: '8px 12px',
      fontSize: 11,
      color: '#6b778c',
      maxWidth: 280,
      zIndex: 15,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: '#172b4d' }}>
        Code-only elements ({readOnlyLines.length})
      </div>
      <div style={{ fontSize: 10, color: '#97a0af' }}>
        These lines are preserved in your code but can only be edited in the code editor:
        styles, classDefs, click handlers, and unsupported syntax.
      </div>
    </div>
  );
};
