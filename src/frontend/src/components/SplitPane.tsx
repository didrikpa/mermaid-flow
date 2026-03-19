import React, { useState, useCallback, useRef, useEffect } from 'react';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftHeader?: React.ReactNode;
  rightHeader?: React.ReactNode;
  /** Initial left pane width as a fraction (0-1). Default: 0.5 */
  initialSplit?: number;
  /** Minimum pane width in pixels. Default: 200 */
  minWidth?: number;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  left,
  right,
  leftHeader,
  rightHeader,
  initialSplit = 0.5,
  minWidth = 200,
}) => {
  const [splitFraction, setSplitFraction] = useState(initialSplit);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const containerWidth = rect.width;
      const minFraction = minWidth / containerWidth;
      const maxFraction = 1 - minFraction;
      const fraction = Math.min(maxFraction, Math.max(minFraction, x / containerWidth));
      setSplitFraction(fraction);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minWidth]);

  const leftPercent = `${splitFraction * 100}%`;
  const rightPercent = `${(1 - splitFraction) * 100}%`;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        height: '100%',
        border: '1px solid #dfe1e6',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* Left pane */}
      <div style={{ width: leftPercent, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {leftHeader}
        <div style={{ flex: 1, overflow: 'hidden' }}>{left}</div>
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: 5,
          cursor: 'col-resize',
          background: '#f4f5f7',
          borderLeft: '1px solid #dfe1e6',
          borderRight: '1px solid #dfe1e6',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{
          width: 3,
          height: 24,
          borderRadius: 2,
          background: '#c1c7d0',
        }} />
      </div>

      {/* Right pane */}
      <div style={{ width: rightPercent, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {rightHeader}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>{right}</div>
      </div>
    </div>
  );
};
