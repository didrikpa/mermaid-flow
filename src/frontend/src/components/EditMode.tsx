import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDiagramStore } from '../hooks/useDiagramStore';
import { CodeEditor } from './CodeEditor';
import { DiagramRenderer } from './DiagramRenderer';
import { SplitPane } from './SplitPane';
import { GraphEditor } from './VisualEditor/GraphEditor';
import { SequenceEditor } from './VisualEditor/SequenceEditor';
import { SyncEngine, DiagramIR } from '../sync/SyncEngine';
import { SequenceIR } from '../sync/ir';

const GRAPH_TYPES = new Set(['flowchart', 'state', 'er', 'class']);

export const EditMode: React.FC = () => {
  const { code, diagramType, lastEditOrigin, setCode, undo, redo } = useDiagramStore();
  const [parseError, setParseError] = useState<string | null>(null);
  const [ir, setIR] = useState<DiagramIR | null>(null);
  const [syncVersion, setSyncVersion] = useState(0);
  const syncEngineRef = useRef<SyncEngine | null>(null);

  const hasVisualEditor = diagramType && (GRAPH_TYPES.has(diagramType) || diagramType === 'sequence');
  const isGraphType = diagramType && GRAPH_TYPES.has(diagramType);
  const isSequence = diagramType === 'sequence';

  // Global undo/redo keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Initialize sync engine
  useEffect(() => {
    if (!hasVisualEditor || !diagramType) return;

    const engine = new SyncEngine(diagramType, 300);
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

    const initialIR = engine.initFromCode(code);
    setIR(initialIR);
    setSyncVersion(engine.getSyncVersion());

    return () => {
      engine.destroy();
      syncEngineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramType]);

  // Forward code changes to sync engine
  useEffect(() => {
    if (!hasVisualEditor || !syncEngineRef.current) return;
    if (lastEditOrigin === 'visual') return;
    syncEngineRef.current.handleCodeChange(code);
  }, [code, hasVisualEditor, lastEditOrigin]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode, 'code');
    },
    [setCode]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleVisualChange = useCallback((updates: Record<string, any>) => {
    syncEngineRef.current?.handleVisualChange(updates);
  }, []);

  const handleRenderError = useCallback((error: string | null) => {
    setParseError(error);
  }, []);

  const panelLabel = isGraphType ? 'Visual Editor' : isSequence ? 'Sequence Editor' : 'Preview';

  const visualPanel = isGraphType ? (
    <GraphEditor
      ir={ir}
      diagramType={diagramType!}
      onVisualChange={handleVisualChange}
      syncVersion={syncVersion}
    />
  ) : isSequence ? (
    <SequenceEditor
      ir={ir as SequenceIR | null}
      onVisualChange={handleVisualChange}
      syncVersion={syncVersion}
    />
  ) : (
    <DiagramRenderer code={code} onError={handleRenderError} />
  );

  return (
    <div style={{ height: 'calc(100vh - 120px)', minHeight: 400 }}>
      <SplitPane
        left={<CodeEditor value={code} onChange={handleCodeChange} parseError={parseError} />}
        right={visualPanel}
        leftHeader={
          <div style={{ ...panelHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Code</span>
            <a
              href="https://mermaid.js.org/intro/syntax-reference.html"
              target="_blank"
              rel="noopener noreferrer"
              title="Mermaid syntax reference"
              style={{ fontSize: 12, color: '#6b778c', textDecoration: 'none', textTransform: 'none', fontWeight: 400 }}
            >
              ?
            </a>
          </div>
        }
        rightHeader={<div style={panelHeaderStyle}>{panelLabel}</div>}
      />
    </div>
  );
};

const panelHeaderStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#f4f5f7',
  borderBottom: '1px solid #ebecf0',
  fontSize: 11,
  fontWeight: 600,
  color: '#6b778c',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};
