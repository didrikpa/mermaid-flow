import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
});

interface DiagramRendererProps {
  code: string;
  onError?: (error: string | null) => void;
}

let renderCounter = 0;

export const DiagramRenderer: React.FC<DiagramRendererProps> = ({ code, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code.trim()) {
      setSvg('');
      setError(null);
      onError?.(null);
      return;
    }

    const id = `mermaid-diagram-${++renderCounter}`;

    mermaid
      .render(id, code.trim())
      .then(({ svg: renderedSvg }) => {
        setSvg(renderedSvg);
        setError(null);
        onError?.(null);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        onError?.(msg);
      });
  }, [code, onError]);

  if (error) {
    return (
      <div style={{
        padding: 16,
        color: '#ae2a19',
        backgroundColor: '#ffedeb',
        borderRadius: 4,
        fontSize: 13,
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        overflow: 'auto',
      }}>
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div style={{ padding: 16, color: '#6b778c', fontSize: 14 }}>
        No diagram to render
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: 16,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
