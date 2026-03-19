import React, { useRef, useState } from 'react';
import { DiagramRenderer } from './DiagramRenderer';
import { exportSvg, exportPng } from './exportUtils';

interface ViewModeProps {
  code: string;
}

export const ViewMode: React.FC<ViewModeProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportSvg = () => {
    if (containerRef.current) exportSvg(containerRef.current);
  };

  const handleExportPng = async () => {
    if (containerRef.current) await exportPng(containerRef.current);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <DiagramRenderer code={code} />
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        gap: 4,
        zIndex: 10,
      }}>
        <button
          onClick={handleExportSvg}
          title="Export as SVG"
          style={toolbarBtnStyle}
        >
          Export SVG
        </button>
        <button
          onClick={handleExportPng}
          title="Export as PNG"
          style={toolbarBtnStyle}
        >
          Export PNG
        </button>
        <button
          onClick={handleCopy}
          title="Copy Mermaid code"
          aria-label={copied ? 'Mermaid code copied to clipboard' : 'Copy Mermaid code to clipboard'}
          style={{
            ...toolbarBtnStyle,
            background: copied ? '#00875a' : '#f4f5f7',
            color: copied ? '#fff' : '#42526e',
            border: '1px solid ' + (copied ? '#00875a' : '#dfe1e6'),
          }}
        >
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
    </div>
  );
};

const toolbarBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 500,
  background: '#f4f5f7',
  color: '#42526e',
  border: '1px solid #dfe1e6',
  borderRadius: 4,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};
