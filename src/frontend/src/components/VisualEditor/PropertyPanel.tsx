import React from 'react';
import { Node, Edge } from '@xyflow/react';
import { NodeShape, EdgeLineStyle, EdgeArrowType } from '../../sync/ir';
import type { FlowNode, FlowEdge } from './irToReactFlow';

interface PropertyPanelProps {
  selectedNode: Node<FlowNode> | null;
  selectedEdge: Edge<FlowEdge> | null;
  diagramType: string;
  onNodeUpdate: (id: string, data: Partial<FlowNode>) => void;
  onEdgeUpdate: (id: string, data: Partial<FlowEdge>) => void;
  onClose: () => void;
}

const NODE_SHAPES: { value: NodeShape; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'rounded', label: 'Rounded Rectangle' },
  { value: 'stadium', label: 'Pill' },
  { value: 'rhombus', label: 'Diamond' },
  { value: 'circle', label: 'Circle' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'cylinder', label: 'Cylinder' },
  { value: 'subroutine', label: 'Double Border' },
  { value: 'parallelogram', label: 'Parallelogram' },
  { value: 'trapezoid', label: 'Trapezoid' },
  { value: 'asymmetric', label: 'Flag' },
  { value: 'double_circle', label: 'Double Circle' },
];

const LINE_STYLES: { value: EdgeLineStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'thick', label: 'Thick' },
];

const ARROW_TYPES: { value: EdgeArrowType; label: string }[] = [
  { value: 'arrow', label: 'Arrow' },
  { value: 'open', label: 'Open' },
  { value: 'cross', label: 'Cross' },
  { value: 'circle', label: 'Circle' },
];

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  right: 8,
  top: 8,
  width: 220,
  background: '#fff',
  border: '1px solid #dfe1e6',
  borderRadius: 8,
  padding: 16,
  fontSize: 13,
  zIndex: 20,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 4,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
  color: '#6b778c',
  padding: '0 2px',
  lineHeight: 1,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b778c',
  textTransform: 'uppercase',
  marginBottom: 4,
  marginTop: 12,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #dfe1e6',
  borderRadius: 4,
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'auto' as React.CSSProperties['appearance'],
};

// Only flowcharts support node shape changes
const SHAPE_TYPES = new Set(['flowchart']);

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedNode,
  selectedEdge,
  diagramType,
  onNodeUpdate,
  onEdgeUpdate,
  onClose,
}) => {
  if (!selectedNode && !selectedEdge) return null;

  if (selectedNode) {
    return (
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600, color: '#172b4d' }}>Node Properties</span>
          <button onClick={onClose} aria-label="Close panel" style={closeBtnStyle}>&times;</button>
        </div>
        <label style={{ ...labelStyle, marginTop: 8 }}>Label</label>
        <input
          style={inputStyle}
          value={selectedNode.data.label}
          onChange={(e) => onNodeUpdate(selectedNode.id, { label: e.target.value })}
        />
        {SHAPE_TYPES.has(diagramType) && (
          <>
            <label style={labelStyle}>Shape</label>
            <select
              style={selectStyle}
              value={selectedNode.data.shape}
              onChange={(e) => onNodeUpdate(selectedNode.id, { shape: e.target.value })}
            >
              {NODE_SHAPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </>
        )}
      </div>
    );
  }

  if (selectedEdge) {
    return (
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600, color: '#172b4d' }}>Edge Properties</span>
          <button onClick={onClose} aria-label="Close panel" style={closeBtnStyle}>&times;</button>
        </div>
        <label style={{ ...labelStyle, marginTop: 8 }}>Label</label>
        <input
          style={inputStyle}
          value={selectedEdge.data?.label || ''}
          onChange={(e) => onEdgeUpdate(selectedEdge.id, { label: e.target.value })}
        />
        <label style={labelStyle}>Line Style</label>
        <select
          style={selectStyle}
          value={selectedEdge.data?.lineStyle || 'solid'}
          onChange={(e) => onEdgeUpdate(selectedEdge.id, { lineStyle: e.target.value as EdgeLineStyle })}
        >
          {LINE_STYLES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <label style={labelStyle}>Arrow Type</label>
        <select
          style={selectStyle}
          value={selectedEdge.data?.arrowType || 'arrow'}
          onChange={(e) => onEdgeUpdate(selectedEdge.id, { arrowType: e.target.value as EdgeArrowType })}
        >
          {ARROW_TYPES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return null;
};
