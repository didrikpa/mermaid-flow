import React from 'react';
import { DiagramType, DIAGRAM_LABELS } from '../types/diagram';

interface DiagramTypePickerProps {
  onSelect: (type: DiagramType) => void;
}

const TYPES: DiagramType[] = ['flowchart', 'sequence', 'state', 'er', 'class', 'other'];

const TYPE_ICONS: Record<DiagramType, string> = {
  flowchart: '⬡',
  sequence: '↔',
  state: '◎',
  er: '⊞',
  class: '▤',
  other: '</>',
};

export const DiagramTypePicker: React.FC<DiagramTypePickerProps> = ({ onSelect }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 48,
      minHeight: 300,
    }}>
      <h2 style={{
        margin: '0 0 8px',
        fontSize: 20,
        fontWeight: 600,
        color: '#172b4d',
      }}>
        Create a diagram
      </h2>
      <p style={{
        margin: '0 0 32px',
        fontSize: 14,
        color: '#6b778c',
      }}>
        Choose a diagram type to get started with a template
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        maxWidth: 480,
        width: '100%',
      }}>
        {TYPES.map((type) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '20px 16px',
              border: '2px solid #dfe1e6',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontSize: 14,
              color: '#172b4d',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4c9aff';
              e.currentTarget.style.background = '#f4f5f7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#dfe1e6';
              e.currentTarget.style.background = '#fff';
            }}
          >
            <span style={{ fontSize: 24 }}>{TYPE_ICONS[type]}</span>
            {DIAGRAM_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
};
