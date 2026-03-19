import React, { useEffect, useRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle, StreamLanguage, StringStream } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { Diagnostic, setDiagnostics } from '@codemirror/lint';

// Mermaid syntax highlighting via StreamLanguage
const mermaidStreamParser = {
  token(stream: StringStream): string | null {
    // Comments
    if (stream.match(/^%%/)) {
      stream.skipToEnd();
      return 'comment';
    }
    // Strings
    if (stream.match(/^"[^"]*"/)) return 'string';
    // Keywords
    if (stream.match(/^(graph|flowchart|sequenceDiagram|stateDiagram|stateDiagram-v2|erDiagram|classDiagram|participant|actor|Note|note|loop|alt|else|opt|par|and|critical|break|rect|end|subgraph|direction|class|style|classDef|linkStyle|click)\b/)) {
      return 'keyword';
    }
    // Arrows / operators
    if (stream.match(/^(-->|==>|-.->|---->|---|===|-.-)/) || stream.match(/^(-->>|--\)|--x|->>|-\)|->)/)) {
      return 'operator';
    }
    // Direction keywords
    if (stream.match(/^(TD|TB|BT|RL|LR)\b/)) return 'keyword';
    // Labels in brackets/parens
    if (stream.match(/^[\[\]{}()|<>]/)) return 'bracket';
    // Numbers
    if (stream.match(/^\d+/)) return 'number';
    // Identifiers
    if (stream.match(/^[a-zA-Z_]\w*/)) return 'variableName';
    // Default
    stream.next();
    return null;
  },
};

const mermaidLanguage = StreamLanguage.define(mermaidStreamParser);

const mermaidHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#0052cc', fontWeight: 'bold' },
  { tag: tags.comment, color: '#6b778c', fontStyle: 'italic' },
  { tag: tags.string, color: '#00875a' },
  { tag: tags.operator, color: '#ae2a19' },
  { tag: tags.variableName, color: '#172b4d' },
  { tag: tags.bracket, color: '#6554c0' },
  { tag: tags.number, color: '#bf2600' },
]);

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  parseError?: string | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, parseError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Track whether we're doing an external update to avoid echo
  const isExternalUpdate = useRef(false);

  const handleUpdate = useCallback((update: { docChanged: boolean; state: EditorState }) => {
    if (update.docChanged && !isExternalUpdate.current) {
      const newValue = update.state.doc.toString();
      onChangeRef.current(newValue);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        mermaidLanguage,
        syntaxHighlighting(mermaidHighlightStyle),
        EditorView.updateListener.of(handleUpdate),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '13px',
            fontFamily: '"SF Mono", "Fira Code", "Fira Mono", Menlo, monospace',
          },
          '.cm-content': { padding: '8px 0' },
          '.cm-gutters': {
            backgroundColor: '#f4f5f7',
            color: '#97a0af',
            border: 'none',
            borderRight: '1px solid #ebecf0',
          },
          '.cm-activeLine': { backgroundColor: '#f4f5f7' },
          '.cm-activeLineGutter': { backgroundColor: '#ebecf0' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      isExternalUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
      isExternalUpdate.current = false;
    }
  }, [value]);

  // Show parse errors as diagnostics
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const diagnostics: Diagnostic[] = [];
    if (parseError) {
      // Try to extract line number from error
      const lineMatch = parseError.match(/line\s+(\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
      const lineObj = view.state.doc.line(Math.min(line, view.state.doc.lines));
      diagnostics.push({
        from: lineObj.from,
        to: lineObj.to,
        severity: 'error',
        message: parseError,
      });
    }
    view.dispatch(setDiagnostics(view.state, diagnostics));
  }, [parseError]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        border: '1px solid #dfe1e6',
        borderRadius: 4,
      }}
    />
  );
};
