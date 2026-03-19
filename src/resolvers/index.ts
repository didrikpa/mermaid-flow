import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

const resolver = new Resolver();

interface DiagramData {
  version: number;
  type: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

resolver.define('getDiagram', async ({ payload }: { payload: { localId: string } }) => {
  const key = `diagram:${payload.localId}`;
  const data = await storage.get(key) as DiagramData | undefined;
  return data ?? null;
});

resolver.define('saveDiagram', async ({ payload }: { payload: { localId: string; type: string; code: string } }) => {
  const key = `diagram:${payload.localId}`;
  const existing = await storage.get(key) as DiagramData | undefined;
  const now = new Date().toISOString();

  const data: DiagramData = {
    version: 1,
    type: payload.type,
    code: payload.code,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await storage.set(key, data);
  return data;
});

resolver.define('deleteDiagram', async ({ payload }: { payload: { localId: string } }) => {
  const key = `diagram:${payload.localId}`;
  await storage.delete(key);
  return { success: true };
});

export const handler = resolver.getDefinitions();
