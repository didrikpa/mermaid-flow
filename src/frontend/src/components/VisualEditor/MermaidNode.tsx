import React, { useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeShape } from '../../sync/ir';

interface MermaidNodeProps {
  data: { label: string; shape: string };
  selected?: boolean;
}

const SHAPE_STYLES: Record<NodeShape, React.CSSProperties> = {
  rectangle: { borderRadius: 4 },
  rounded: { borderRadius: 8 },
  stadium: { borderRadius: 999, paddingLeft: 24, paddingRight: 24 },
  subroutine: { borderRadius: 4, borderWidth: 3, borderStyle: 'double' },
  cylinder: { borderRadius: '50% / 10%' },
  circle: { borderRadius: '50%', width: 80, height: 80 },
  asymmetric: { borderRadius: '0 0 0 20px' },
  rhombus: { transform: 'rotate(45deg)', width: 60, height: 60 },
  hexagon: { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
  parallelogram: { transform: 'skewX(-10deg)' },
  parallelogram_alt: { transform: 'skewX(10deg)' },
  trapezoid: { clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)' },
  trapezoid_alt: { clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)' },
  double_circle: { borderRadius: '50%', width: 80, height: 80, boxShadow: 'inset 0 0 0 4px #fff, inset 0 0 0 6px #4c9aff' },
};

export const MermaidNode: React.FC<MermaidNodeProps> = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label);

  const shape = (data.shape || 'rectangle') as NodeShape;
  const isStateMarker = data.label === '[*]';
  const isEndMarker = isStateMarker && shape === 'double_circle';
  const shapeStyle = SHAPE_STYLES[shape] || SHAPE_STYLES.rectangle;
  const isRotated = shape === 'rhombus';
  const isSkewed = shape === 'parallelogram' || shape === 'parallelogram_alt';
  const needsCounterTransform = isRotated || isSkewed;
  const counterTransform: React.CSSProperties | undefined = isRotated
    ? { transform: 'rotate(-45deg)' }
    : isSkewed
    ? { transform: shape === 'parallelogram' ? 'skewX(10deg)' : 'skewX(-10deg)' }
    : undefined;

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label);
  }, [data.label]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    // Label updates are handled through the parent via onNodesChange
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
    if (e.key === 'Escape') {
      setEditLabel(data.label);
      setIsEditing(false);
    }
  }, [data.label]);

  // State diagram start marker: small filled circle
  // State diagram end marker: filled circle with outer ring
  if (isStateMarker) {
    return (
      <div
        style={{
          width: isEndMarker ? 28 : 24,
          height: isEndMarker ? 28 : 24,
          borderRadius: '50%',
          background: selected ? '#4c9aff' : '#172b4d',
          border: isEndMarker
            ? `4px double ${selected ? '#4c9aff' : '#172b4d'}`
            : `2px solid ${selected ? '#4c9aff' : '#172b4d'}`,
          cursor: 'grab',
          transition: 'border-color 0.15s ease',
        }}
      >
        <Handle type="target" position={Position.Top} style={{ background: '#4c9aff', width: 6, height: 6 }} />
        <Handle type="source" position={Position.Bottom} style={{ background: '#4c9aff', width: 6, height: 6 }} />
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        border: `2px solid ${selected ? '#4c9aff' : '#dfe1e6'}`,
        padding: '8px 16px',
        minWidth: 80,
        minHeight: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        fontSize: 13,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#172b4d',
        transition: 'border-color 0.15s ease',
        ...shapeStyle,
      }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#4c9aff', width: 8, height: 8 }} />
      <div style={needsCounterTransform ? counterTransform : undefined}>
        {isEditing ? (
          <input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              border: 'none',
              background: 'transparent',
              textAlign: 'center',
              fontSize: 13,
              width: '100%',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <span>{data.label}</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#4c9aff', width: 8, height: 8 }} />
    </div>
  );
};
