import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDiagramStore } from '../hooks/useDiagramStore';
import { CodeEditor } from './CodeEditor';
import { DiagramRenderer } from './DiagramRenderer';
import { GraphEditor } from './VisualEditor/GraphEditor';
import { SequenceEditor } from './VisualEditor/SequenceEditor';
import { SyncEngine } from '../sync/SyncEngine';
import { FlowchartIR, IRNode, IREdge } from '../sync/ir';

const VISUAL_EDITOR_TYPES = new Set(['flowchart', 'state', 'er', 'class']);

export const EditMode: React.FC = () => {
  const { code, diagramType, lastEditOrigin, setCode } = useDiagramStore();
  const [parseError, setParseError] = useState<string | null>(null);
  const [ir, setIR] = useState<FlowchartIR | null>(null);
  const [syncVersion, setSyncVersion] = useState(0);
  const syncEngineRef = useRef<SyncEngine | null>(null);

  const hasVisualEditor = diagramType && VISUAL_EDITOR_TYPES.has(diagramType);
  const isSequence = diagramType === 'sequence';

  // Initialize sync engine
  useEffect(() => {
    if (!hasVisualEditor) return;

    const engine = new SyncEngine(300);
    syncEngineRef.current = engine;

    engine.setCallbacks(
      (newCode) => {
        setCode(newCode, 'visual');
      },
      (newIR) => {
        setIR(newIR);
        setSyncVersion(engine.getSyncVersion());
      }
    );

    // Initial parse
    const initialIR = engine.initFromCode(code);
    setIR(initialIR);
    setSyncVersion(engine.getSyncVersion());

    return () => {
      engine.destroy();
      syncEngineRef.current = null;
    };
    // Only on mount/type change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramType]);

  // Forward code changes to sync engine
  useEffect(() => {
    if (!hasVisualEditor || !syncEngineRef.current) return;
    if (lastEditOrigin === 'visual') return; // Don't echo back
    syncEngineRef.current.handleCodeChange(code);
  }, [code, hasVisualEditor, lastEditOrigin]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode, 'code');
    },
    [setCode]
  );

  const handleVisualChange = useCallback(
    (updates: {
      modifiedNodes?: Map<string, IRNode>;
      modifiedEdges?: Map<number, IREdge>;
      newNodes?: IRNode[];
      newEdges?: IREdge[];
      removedNodes?: Set<string>;
      removedEdges?: Set<number>;
    }) => {
      syncEngineRef.current?.handleVisualChange(updates);
    },
    []
  );

  const handleRenderError = useCallback((error: string | null) => {
    setParseError(error);
  }, []);

  // Side-by-side layout: code left, visual right
  return (
    <div style={{ display: 'flex', height: 500, border: '1px solid #dfe1e6', borderRadius: 4, overflow: 'hidden' }}>
      {/* Code Editor Panel */}
      <div style={{
        width: hasVisualEditor || isSequence ? '50%' : '50%',
        borderRight: '1px solid #dfe1e6',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '8px 12px',
          background: '#f4f5f7',
          borderBottom: '1px solid #ebecf0',
          fontSize: 11,
          fontWeight: 600,
          color: '#6b778c',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          Code
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CodeEditor value={code} onChange={handleCodeChange} parseError={parseError} />
        </div>
      </div>

      {/* Visual / Preview Panel */}
      <div style={{
        width: '50%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '8px 12px',
          background: '#f4f5f7',
          borderBottom: '1px solid #ebecf0',
          fontSize: 11,
          fontWeight: 600,
          color: '#6b778c',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {hasVisualEditor ? 'Visual Editor' : isSequence ? 'Sequence Editor' : 'Preview'}
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {hasVisualEditor ? (
            <GraphEditor
              ir={ir}
              onVisualChange={handleVisualChange}
              syncVersion={syncVersion}
            />
          ) : isSequence ? (
            <SequenceEditor code={code} />
          ) : (
            <DiagramRenderer code={code} onError={handleRenderError} />
          )}
        </div>
      </div>
    </div>
  );
};
