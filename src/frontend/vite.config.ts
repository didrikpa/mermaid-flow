import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Mermaid in its own chunk — loaded by both view and edit modes
          mermaid: ['mermaid'],
          // Editor dependencies in a separate chunk — only loaded in edit mode
          editor: [
            'codemirror',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/commands',
            '@codemirror/language',
            '@codemirror/lint',
          ],
          // React Flow in its own chunk — only loaded for graph visual editors
          reactflow: ['@xyflow/react', 'dagre'],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
