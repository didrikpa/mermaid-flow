import React, { useEffect, useState } from 'react';
import { MacroShell } from './components/MacroShell';

// In a real Forge Custom UI, the macro context provides localId and editing state.
// For development, we simulate this.
function useForgeContext() {
  const [context, setContext] = useState<{ localId: string; isEditing: boolean } | null>(null);

  useEffect(() => {
    // Try to get Forge context via bridge
    import('@forge/bridge').then(({ view }) => {
      view.getContext().then((ctx) => {
        const ctxAny = ctx as unknown as Record<string, unknown>;
        const extension = ctxAny.extension as Record<string, unknown> | undefined;
        setContext({
          localId: (extension?.macro as Record<string, unknown>)?.id as string || 'dev-local-1',
          isEditing: ctxAny.renderContext === 'edit' || extension?.renderContext === 'edit',
        });
      }).catch(() => {
        // Development fallback
        setContext({ localId: 'dev-local-1', isEditing: true });
      });
    }).catch(() => {
      // Development fallback
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
