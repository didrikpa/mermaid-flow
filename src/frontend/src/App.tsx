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

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 0' }}>
      <MacroShell localId={context.localId} isEditing={context.isEditing} />
    </div>
  );
};

export default App;
