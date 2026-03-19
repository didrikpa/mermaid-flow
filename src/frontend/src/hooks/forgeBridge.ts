// Abstraction over @forge/bridge that gracefully falls back to
// in-memory stubs when running outside Confluence (local dev).

let bridgeAvailable: boolean | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let invokeImpl: ((fn: string, payload?: any) => Promise<any>) | null = null;

const memoryStore = new Map<string, unknown>();

async function ensureBridge() {
  if (bridgeAvailable !== null) return bridgeAvailable;
  try {
    const bridge = await import('@forge/bridge');
    // Probe the bridge — getContext() will throw if not in Forge
    await bridge.view.getContext();
    invokeImpl = bridge.invoke;
    bridgeAvailable = true;
  } catch {
    bridgeAvailable = false;
    invokeImpl = null;
  }
  return bridgeAvailable;
}

export async function invoke<T>(functionKey: string, payload?: unknown): Promise<T> {
  const available = await ensureBridge();
  if (available && invokeImpl) {
    return invokeImpl(functionKey, payload) as Promise<T>;
  }

  // In-memory fallback for local dev
  const p = payload as Record<string, unknown> | undefined;
  switch (functionKey) {
    case 'getDiagram': {
      const key = `diagram:${p?.localId}`;
      return (memoryStore.get(key) ?? null) as T;
    }
    case 'saveDiagram': {
      const key = `diagram:${p?.localId}`;
      const data = {
        version: 1,
        type: p?.type,
        code: p?.code,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryStore.set(key, data);
      return data as T;
    }
    case 'deleteDiagram': {
      const key = `diagram:${p?.localId}`;
      memoryStore.delete(key);
      return { success: true } as T;
    }
    default:
      throw new Error(`Unknown function: ${functionKey}`);
  }
}

export async function getForgeContext(): Promise<{
  localId: string;
  isEditing: boolean;
}> {
  const available = await ensureBridge();
  if (available) {
    const bridge = await import('@forge/bridge');
    const ctx = await bridge.view.getContext() as unknown as Record<string, unknown>;
    const extension = ctx.extension as Record<string, unknown> | undefined;
    return {
      localId: (extension?.macro as Record<string, unknown>)?.id as string || 'dev-local-1',
      isEditing: ctx.renderContext === 'edit' || extension?.renderContext === 'edit',
    };
  }

  // Dev fallback
  return { localId: 'dev-local-1', isEditing: true };
}
