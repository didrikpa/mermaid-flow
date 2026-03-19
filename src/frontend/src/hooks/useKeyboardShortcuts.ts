import { useEffect, useState, useCallback } from 'react';

interface ShortcutAction {
  key: string;
  mod?: boolean;  // Cmd/Ctrl
  shift?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutAction[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const isMod = e.metaKey || e.ctrlKey;
      for (const s of shortcuts) {
        const modMatch = s.mod ? isMod : !isMod;
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
        if (e.key === s.key && modMatch && shiftMatch) {
          e.preventDefault();
          s.action();
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

export function useShortcutHelp() {
  const [visible, setVisible] = useState(false);
  const toggle = useCallback(() => setVisible(v => !v), []);
  const hide = useCallback(() => setVisible(false), []);
  return { visible, toggle, hide };
}

export const SHORTCUT_DESCRIPTIONS = [
  { keys: 'Cmd+Z', description: 'Undo' },
  { keys: 'Cmd+Shift+Z', description: 'Redo' },
  { keys: 'Delete / Backspace', description: 'Delete selected' },
  { keys: 'Escape', description: 'Deselect all' },
  { keys: '?', description: 'Toggle shortcut help' },
];
