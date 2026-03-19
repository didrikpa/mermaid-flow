import React from 'react';

interface SequenceEditorProps {
  code: string;
}

// Placeholder for Phase 5 — sequence diagrams have a different editing paradigm
// (timeline-based rather than graph-based), so they get their own custom SVG editor.
export const SequenceEditor: React.FC<SequenceEditorProps> = ({ code }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#6b778c',
      fontSize: 14,
      padding: 24,
      textAlign: 'center',
    }}>
      <div>
        <p style={{ fontWeight: 500, marginBottom: 8 }}>Sequence Diagram Visual Editor</p>
        <p style={{ fontSize: 12 }}>
          Coming soon. Use the code editor to create sequence diagrams — they render live in the preview.
        </p>
      </div>
    </div>
  );
};
