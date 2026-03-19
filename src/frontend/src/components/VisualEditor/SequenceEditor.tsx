import React, { useState, useCallback, useEffect, useRef, MouseEvent as ReactMouseEvent } from 'react';
import { SequenceIR, SequenceParticipant, SequenceMessage, SequenceArrowType } from '../../sync/ir';

interface SequenceEditorProps {
  ir: SequenceIR | null;
  onVisualChange: (updates: {
    modifiedParticipants?: Map<string, SequenceParticipant>;
    modifiedMessages?: Map<number, SequenceMessage>;
    newParticipants?: SequenceParticipant[];
    newMessages?: SequenceMessage[];
    removedParticipants?: Set<string>;
    removedMessages?: Set<number>;
    reorderedParticipants?: string[];
  }) => void;
  syncVersion: number;
}

const LANE_WIDTH = 160;
const LANE_GAP = 20;
const HEADER_HEIGHT = 60;
const MESSAGE_HEIGHT = 50;
const PADDING = 20;

const ARROW_LABELS: Record<SequenceArrowType, string> = {
  solid: 'Solid (->>) ',
  solid_open: 'Open (->)',
  dashed: 'Dashed (-->>)',
  dashed_open: 'Dashed open (-->)',
  cross: 'Cross (-x)',
  dashed_cross: 'Dashed cross (--x)',
  async: 'Async (-))',
  dashed_async: 'Dashed async (--))',
};

let nextParticipantId = 1;

export const SequenceEditor: React.FC<SequenceEditorProps> = ({ ir, onVisualChange, syncVersion }) => {
  const [participants, setParticipants] = useState<SequenceParticipant[]>([]);
  const [messages, setMessages] = useState<SequenceMessage[]>([]);
  const [selectedMsg, setSelectedMsg] = useState<number | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const lastSyncRef = useRef(0);
  const isVisualEditRef = useRef(false);

  // Sync from IR
  useEffect(() => {
    if (!ir || syncVersion === lastSyncRef.current) return;
    if (isVisualEditRef.current) {
      isVisualEditRef.current = false;
      return;
    }
    lastSyncRef.current = syncVersion;
    setParticipants([...ir.participants]);
    setMessages([...ir.messages]);
  }, [ir, syncVersion]);

  const totalWidth = Math.max(participants.length * (LANE_WIDTH + LANE_GAP) + PADDING * 2, 400);
  const totalHeight = HEADER_HEIGHT + messages.length * MESSAGE_HEIGHT + 120;

  const getLaneX = (idx: number) => PADDING + idx * (LANE_WIDTH + LANE_GAP) + LANE_WIDTH / 2;
  const getParticipantIndex = (id: string) => participants.findIndex(p => p.id === id);

  const pushChange = useCallback((
    newParticipants: SequenceParticipant[],
    newMessages: SequenceMessage[],
  ) => {
    isVisualEditRef.current = true;
    // Compute full diff — for simplicity, send full state as modifications
    const modifiedParticipants = new Map<string, SequenceParticipant>();
    newParticipants.forEach(p => modifiedParticipants.set(p.id, p));
    const modifiedMessages = new Map<number, SequenceMessage>();
    newMessages.forEach((m, i) => modifiedMessages.set(i, m));
    onVisualChange({ modifiedParticipants, modifiedMessages });
  }, [onVisualChange]);

  // Add participant or actor
  const handleAddParticipant = useCallback((type: 'participant' | 'actor' = 'participant') => {
    const id = `P${nextParticipantId++}`;
    const newP: SequenceParticipant = { id, alias: id, type, raw: '' };
    const updated = [...participants, newP];
    setParticipants(updated);
    isVisualEditRef.current = true;
    onVisualChange({ newParticipants: [newP] });
  }, [participants, onVisualChange]);

  // Remove participant
  const handleRemoveParticipant = useCallback((id: string) => {
    const updated = participants.filter(p => p.id !== id);
    const updatedMsgs = messages.filter(m => m.from !== id && m.to !== id);
    setParticipants(updated);
    setMessages(updatedMsgs);
    isVisualEditRef.current = true;
    onVisualChange({ removedParticipants: new Set([id]) });
  }, [participants, messages, onVisualChange]);

  // Rename participant
  const handleRenameParticipant = useCallback((id: string, newAlias: string) => {
    const updated = participants.map(p => p.id === id ? { ...p, alias: newAlias } : p);
    setParticipants(updated);
    pushChange(updated, messages);
  }, [participants, messages, pushChange]);

  // Reorder participants via drag
  const handleParticipantDrop = useCallback((draggedId: string, targetIdx: number) => {
    const current = [...participants];
    const fromIdx = current.findIndex(p => p.id === draggedId);
    if (fromIdx === -1 || fromIdx === targetIdx) return;
    const [item] = current.splice(fromIdx, 1);
    current.splice(targetIdx, 0, item);
    setParticipants(current);
    isVisualEditRef.current = true;
    onVisualChange({ reorderedParticipants: current.map(p => p.id) });
  }, [participants, onVisualChange]);

  // Add message
  const handleAddMessage = useCallback(() => {
    if (participants.length < 2) return;
    const msg: SequenceMessage = {
      from: participants[0].id,
      to: participants[1].id,
      arrowType: 'solid',
      text: 'message',
      raw: '',
    };
    const updated = [...messages, msg];
    setMessages(updated);
    isVisualEditRef.current = true;
    onVisualChange({ newMessages: [msg] });
  }, [participants, messages, onVisualChange]);

  // Update message
  const handleUpdateMessage = useCallback((idx: number, updates: Partial<SequenceMessage>) => {
    const updated = messages.map((m, i) => i === idx ? { ...m, ...updates } : m);
    setMessages(updated);
    pushChange(participants, updated);
  }, [messages, participants, pushChange]);

  // Remove message
  const handleRemoveMessage = useCallback((idx: number) => {
    const updated = messages.filter((_, i) => i !== idx);
    setMessages(updated);
    isVisualEditRef.current = true;
    onVisualChange({ removedMessages: new Set([idx]) });
  }, [messages, onVisualChange]);

  const panelRef = useRef<HTMLDivElement>(null);

  const handleBackgroundClick = useCallback((e: ReactMouseEvent) => {
    // Dismiss the message panel when clicking outside it and outside messages
    if (selectedMsg !== null && panelRef.current && !panelRef.current.contains(e.target as Node)) {
      const target = e.target as SVGElement | HTMLElement;
      // Don't dismiss if clicking on a message arrow or its label
      if (!target.closest?.('g[style*="cursor: pointer"]')) {
        setSelectedMsg(null);
      }
    }
  }, [selectedMsg]);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}
      onClick={handleBackgroundClick}>
      {/* Toolbar */}
      <div style={{
        padding: '6px 12px',
        borderBottom: '1px solid #ebecf0',
        display: 'flex',
        gap: 4,
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button onClick={() => handleAddParticipant('participant')} style={toolbarBtnStyle}>+ Participant</button>
        <button onClick={() => handleAddParticipant('actor')} style={toolbarBtnStyle}>+ Actor</button>
        <button onClick={handleAddMessage} style={toolbarBtnStyle} disabled={participants.length < 2}>+ Message</button>
      </div>

      {/* SVG Canvas */}
      <svg width={totalWidth} height={totalHeight} style={{ display: 'block', margin: '0 auto' }}>
        {/* Lifelines */}
        {participants.map((p, i) => {
          const x = getLaneX(i);
          return (
            <g key={p.id}>
              {/* Lifeline */}
              <line x1={x} y1={HEADER_HEIGHT} x2={x} y2={totalHeight - 20}
                stroke="#dfe1e6" strokeWidth={1} strokeDasharray="4,4" />

              {p.type === 'actor' ? (
                /* Stick figure for actors */
                <g
                  style={{ cursor: 'grab' }}
                  onMouseDown={() => setDragSource(p.id)}
                  onMouseUp={() => {
                    if (dragSource && dragSource !== p.id) {
                      handleParticipantDrop(dragSource, i);
                    }
                    setDragSource(null);
                  }}
                  onDoubleClick={() => setEditingParticipant(p.id)}
                >
                  {/* Head */}
                  <circle cx={x} cy={16} r={6}
                    fill="none" stroke={editingParticipant === p.id ? '#4c9aff' : '#42526e'} strokeWidth={1.5} />
                  {/* Body */}
                  <line x1={x} y1={22} x2={x} y2={35}
                    stroke={editingParticipant === p.id ? '#4c9aff' : '#42526e'} strokeWidth={1.5} />
                  {/* Arms */}
                  <line x1={x - 10} y1={27} x2={x + 10} y2={27}
                    stroke={editingParticipant === p.id ? '#4c9aff' : '#42526e'} strokeWidth={1.5} />
                  {/* Legs */}
                  <line x1={x} y1={35} x2={x - 8} y2={45}
                    stroke={editingParticipant === p.id ? '#4c9aff' : '#42526e'} strokeWidth={1.5} />
                  <line x1={x} y1={35} x2={x + 8} y2={45}
                    stroke={editingParticipant === p.id ? '#4c9aff' : '#42526e'} strokeWidth={1.5} />
                </g>
              ) : (
                /* Box for participants */
                <rect
                  x={x - LANE_WIDTH / 2 + 10} y={10}
                  width={LANE_WIDTH - 20} height={40}
                  rx={4} fill="#fff" stroke={editingParticipant === p.id ? '#4c9aff' : '#dfe1e6'}
                  strokeWidth={editingParticipant === p.id ? 2 : 1}
                  style={{ cursor: 'grab' }}
                  onMouseDown={() => setDragSource(p.id)}
                  onMouseUp={() => {
                    if (dragSource && dragSource !== p.id) {
                      handleParticipantDrop(dragSource, i);
                    }
                    setDragSource(null);
                  }}
                  onDoubleClick={() => setEditingParticipant(p.id)}
                />
              )}

              {/* Label */}
              {editingParticipant === p.id ? (
                <foreignObject x={x - LANE_WIDTH / 2 + 14} y={p.type === 'actor' ? 46 : 16} width={LANE_WIDTH - 28} height={28}>
                  <input
                    autoFocus
                    defaultValue={p.alias}
                    onBlur={(e) => {
                      handleRenameParticipant(p.id, e.target.value);
                      setEditingParticipant(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditingParticipant(null);
                    }}
                    style={{
                      width: '100%', border: 'none', textAlign: 'center',
                      fontSize: 12, fontFamily: 'inherit', outline: 'none',
                      background: 'transparent',
                    }}
                  />
                </foreignObject>
              ) : (
                <text x={x} y={p.type === 'actor' ? 58 : 35} textAnchor="middle" fontSize={12} fill="#172b4d" fontWeight={500}>
                  {p.alias}
                </text>
              )}
              {/* Remove button */}
              <text x={x + LANE_WIDTH / 2 - 16} y={p.type === 'actor' ? 14 : 22} fontSize={12} fill="#ae2a19"
                style={{ cursor: 'pointer' }}
                onClick={() => handleRemoveParticipant(p.id)}>
                x
              </text>
            </g>
          );
        })}

        {/* Messages */}
        {messages.map((msg, i) => {
          const fromIdx = getParticipantIndex(msg.from);
          const toIdx = getParticipantIndex(msg.to);
          if (fromIdx === -1 || toIdx === -1) return null;

          const y = HEADER_HEIGHT + 20 + i * MESSAGE_HEIGHT;
          const x1 = getLaneX(fromIdx);
          const x2 = getLaneX(toIdx);
          const isSelected = selectedMsg === i;
          const isDashed = msg.arrowType.startsWith('dashed');

          return (
            <g key={i} onClick={() => setSelectedMsg(isSelected ? null : i)} style={{ cursor: 'pointer' }}>
              {/* Invisible wide hit area for easier clicking */}
              <line x1={x1} y1={y} x2={x2} y2={y}
                stroke="transparent" strokeWidth={16} />
              {/* Arrow line */}
              <line x1={x1} y1={y} x2={x2} y2={y}
                stroke={isSelected ? '#4c9aff' : '#42526e'}
                strokeWidth={isSelected ? 2 : 1.5}
                strokeDasharray={isDashed ? '6,4' : undefined}
                markerEnd="url(#arrowhead)" />
              {/* Label */}
              <text x={(x1 + x2) / 2} y={y - 8}
                textAnchor="middle" fontSize={11} fill="#42526e">
                {msg.text}
              </text>
              {/* Remove button when selected */}
              {isSelected && (
                <text x={Math.max(x1, x2) + 12} y={y + 4} fontSize={11} fill="#ae2a19"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); handleRemoveMessage(i); }}>
                  [del]
                </text>
              )}
            </g>
          );
        })}

        {/* Arrow marker */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#42526e" />
          </marker>
        </defs>
      </svg>

      {/* Selected message editor */}
      {selectedMsg !== null && messages[selectedMsg] && (
        <div ref={panelRef} onClick={(e) => e.stopPropagation()} style={{
          position: 'absolute', right: 8, top: 48, width: 220,
          background: '#fff', border: '1px solid #dfe1e6',
          borderRadius: 8, padding: 16, fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: '#172b4d' }}>Message</span>
            <button
              onClick={() => setSelectedMsg(null)}
              aria-label="Close message editor"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, color: '#6b778c', padding: '0 2px', lineHeight: 1,
              }}
            >
              &times;
            </button>
          </div>
          <label style={labelStyle}>Text</label>
          <input style={inputStyle}
            value={messages[selectedMsg].text}
            onChange={(e) => handleUpdateMessage(selectedMsg, { text: e.target.value })} />
          <label style={labelStyle}>From</label>
          <select style={inputStyle}
            value={messages[selectedMsg].from}
            onChange={(e) => handleUpdateMessage(selectedMsg, { from: e.target.value })}>
            {participants.map(p => <option key={p.id} value={p.id}>{p.alias}</option>)}
          </select>
          <label style={labelStyle}>To</label>
          <select style={inputStyle}
            value={messages[selectedMsg].to}
            onChange={(e) => handleUpdateMessage(selectedMsg, { to: e.target.value })}>
            {participants.map(p => <option key={p.id} value={p.id}>{p.alias}</option>)}
          </select>
          <label style={labelStyle}>Arrow Type</label>
          <select style={inputStyle}
            value={messages[selectedMsg].arrowType}
            onChange={(e) => handleUpdateMessage(selectedMsg, { arrowType: e.target.value as SequenceArrowType })}>
            {(Object.entries(ARROW_LABELS) as [SequenceArrowType, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

const toolbarBtnStyle: React.CSSProperties = {
  padding: '4px 10px', fontSize: 12, fontWeight: 500,
  background: '#0052cc', color: '#fff', border: 'none',
  borderRadius: 4, cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: '#6b778c', textTransform: 'uppercase',
  marginBottom: 4, marginTop: 10,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '5px 8px',
  border: '1px solid #dfe1e6', borderRadius: 4,
  fontSize: 13, fontFamily: 'inherit',
};
