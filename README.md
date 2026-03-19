# Mermaid Flow

Bidirectional Mermaid diagram editor for Confluence Cloud. Code and visual editing, always in sync.

## What it does

- **Code editor** (left): Write Mermaid syntax with syntax highlighting, error indicators, and live preview
- **Visual editor** (right): Drag-and-drop diagram editing for non-technical users
- **Bidirectional sync**: Changes in either editor update the other within 300ms
- **Roundtrip fidelity**: Comments, whitespace, styles, and unsupported syntax are preserved through edits
- **View mode**: Clean rendered diagram with a "Copy Code" export button

## Supported diagram types

| Type | Code editor | Visual editor | Rendering |
|------|:-----------:|:-------------:|:---------:|
| Flowchart | Yes | Yes (React Flow) | Yes |
| Sequence | Yes | Yes (custom SVG) | Yes |
| State | Yes | Yes (React Flow) | Yes |
| ER | Yes | Yes (React Flow) | Yes |
| Class | Yes | Yes (React Flow) | Yes |
| All others | Yes | Preview only | Yes |

## Tech stack

- **Platform**: Atlassian Forge (Custom UI)
- **Frontend**: React 18 + TypeScript
- **Code editor**: CodeMirror 6 (~60KB gz)
- **Visual editor**: React Flow / @xyflow/react (~30KB gz) + custom SVG for sequence
- **Rendering**: mermaid.js v11+ (lazy-loaded)
- **State**: Zustand
- **Layout**: Dagre
- **Build**: Vite with manual chunk splitting
- **Persistence**: Forge KVS (auto-save with 2s debounce)

## Project structure

```
mermaid-flow/
  manifest.yml                          # Forge app manifest
  src/
    resolvers/index.ts                  # Backend: Forge Storage CRUD
    frontend/src/
      App.tsx                           # Forge context + mode router
      components/
        MacroShell.tsx                  # Load → picker / edit / view router
        DiagramTypePicker.tsx           # Type selection with starter templates
        EditMode.tsx                    # Split-pane orchestrator
        ViewMode.tsx                    # Render-only + copy button
        CodeEditor.tsx                  # CodeMirror 6 + Mermaid highlighting
        DiagramRenderer.tsx             # Lazy mermaid.render() wrapper
        ErrorBoundary.tsx               # Error catch with retry
        LoadingSpinner.tsx              # Loading indicator
        VisualEditor/
          GraphEditor.tsx               # React Flow for graph-based diagrams
          SequenceEditor.tsx            # Custom SVG for sequence diagrams
          MermaidNode.tsx               # 14 Mermaid node shapes
          PropertyPanel.tsx             # Node/edge property inspector
          ReadOnlyOverlay.tsx           # Code-only element indicator
          irToReactFlow.ts              # IR ↔ React Flow + Dagre layout
      sync/
        SyncEngine.ts                   # Bidirectional sync orchestrator
        ir.ts                           # Intermediate Representation types
        parsers/                        # Mermaid text → IR (per diagram type)
        serializers/                    # IR → Mermaid text (per diagram type)
      hooks/
        useDiagramStore.ts              # Zustand store
        useForgeStorage.ts              # Forge KVS bridge
        forgeBridge.ts                  # Forge bridge with local dev fallback
      types/diagram.ts                  # Shared types + starter templates
```

## Local development

```bash
# Install dependencies
npm install
cd src/frontend && npm install

# Start dev server (runs outside Confluence with in-memory storage)
npm run dev

# Run tests (64 tests covering all parsers/serializers)
npm test

# Type check
npm run lint

# Build
npm run build
```

Open http://localhost:3000 to use the editor locally. The Forge bridge falls back to in-memory storage when running outside Confluence.

## Deploy to Confluence

```bash
# Register the app (first time only)
forge register

# Deploy
forge deploy

# Install on your Confluence site
forge install
```

## Architecture: bidirectional sync

The sync engine uses a custom line-based parser (not Mermaid's internal parser) to preserve roundtrip fidelity:

1. **Parser** classifies each line (node, edge, comment, directive, style, unknown) and builds an IR with the raw source text preserved
2. **Visual editor** reads the IR to render nodes/edges, and writes back modifications
3. **Serializer** emits raw source verbatim for unmodified lines, regenerating only changed entries
4. **Unknown lines** pass through untouched — the escape hatch for unsupported syntax
5. **Origin tracking** prevents echo loops between code → visual → code

```
Code edit → debounce 300ms → parse to IR → update visual editor
Visual edit → debounce 300ms → serialize IR → update code editor
```
