import React, { useState } from 'react';
import { DiagramRenderer } from './DiagramRenderer';

interface ViewModeProps {
  code: string;
}

export const ViewMode: React.FC<ViewModeProps> = ({ code }) => {
  const [copied, setCopied] = useState(false);

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

  return (
    <div style={{ position: 'relative' }}>
      <DiagramRenderer code={code} />
      <button
        onClick={handleCopy}
        title="Copy Mermaid code"
        aria-label={copied ? 'Mermaid code copied to clipboard' : 'Copy Mermaid code to clipboard'}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 500,
          background: copied ? '#00875a' : '#f4f5f7',
          color: copied ? '#fff' : '#42526e',
          border: '1px solid ' + (copied ? '#00875a' : '#dfe1e6'),
          borderRadius: 4,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          zIndex: 10,
        }}
      >
        {copied ? 'Copied!' : 'Copy Code'}
      </button>
    </div>
  );
};
