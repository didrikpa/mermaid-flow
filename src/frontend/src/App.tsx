import React, { useEffect, useState } from 'react';
import { MacroShell } from './components/MacroShell';
import { getForgeContext } from './hooks/forgeBridge';

function useForgeContext() {
  const [context, setContext] = useState<{ localId: string; isEditing: boolean } | null>(null);

  useEffect(() => {
    getForgeContext()
      .then(setContext)
      .catch(() => {
        setContext({ localId: 'dev-local-1', isEditing: true });
      });
  }, []);

  return context;
}

const App: React.FC = () => {
  const context = useForgeContext();
  const [isEditing, setIsEditing] = useState(true);

  if (!context) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        color: '#6b778c',
      }}>
        Loading...
      </div>
    );
  }

  // In Forge, editing state comes from context. In dev mode, show a toggle.
  const devMode = context.localId === 'dev-local-1';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 0' }}>
      {devMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          marginBottom: 8,
          background: '#f4f5f7',
          borderRadius: 4,
          fontSize: 13,
          color: '#6b778c',
        }}>
          <span>Dev mode:</span>
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              background: isEditing ? '#0052cc' : '#fff',
              color: isEditing ? '#fff' : '#42526e',
              border: '1px solid ' + (isEditing ? '#0052cc' : '#dfe1e6'),
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Edit mode
          </button>
          <button
            onClick={() => setIsEditing(false)}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              background: !isEditing ? '#0052cc' : '#fff',
              color: !isEditing ? '#fff' : '#42526e',
              border: '1px solid ' + (!isEditing ? '#0052cc' : '#dfe1e6'),
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            View mode
          </button>
        </div>
      )}
      <MacroShell localId={context.localId} isEditing={devMode ? isEditing : context.isEditing} />
    </div>
  );
};

export default App;
