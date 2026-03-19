import React, { useEffect, useRef, useState } from 'react';

let mermaidInstance: typeof import('mermaid').default | null = null;
let mermaidLoading: Promise<void> | null = null;
let renderCounter = 0;

async function getMermaid() {
  if (mermaidInstance) return mermaidInstance;
  if (!mermaidLoading) {
    mermaidLoading = import('mermaid').then((mod) => {
      mermaidInstance = mod.default;
      mermaidInstance.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'strict',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      });
    });
  }
  await mermaidLoading;
  return mermaidInstance!;
}

interface DiagramRendererProps {
  code: string;
  onError?: (error: string | null) => void;
}

export const DiagramRenderer: React.FC<DiagramRendererProps> = ({ code, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code.trim()) {
      setSvg('');
      setError(null);
      onError?.(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getMermaid()
      .then((mermaid) => {
        if (cancelled) return;
        const id = `mermaid-diagram-${++renderCounter}`;
        return mermaid.render(id, code.trim());
      })
      .then((result) => {
        if (cancelled || !result) return;
        setSvg(result.svg);
        setError(null);
        onError?.(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        onError?.(msg);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code, onError]);

  if (loading && !svg) {
    return (
      <div style={{ padding: 16, color: '#6b778c', fontSize: 14 }}>
        Rendering diagram...
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
