export type DiagramType =
  | 'flowchart'
  | 'sequence'
  | 'state'
  | 'er'
  | 'class'
  | 'other';

export interface DiagramData {
  version: number;
  type: DiagramType;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export const DIAGRAM_LABELS: Record<DiagramType, string> = {
  flowchart: 'Flowchart',
  sequence: 'Sequence',
  state: 'State Diagram',
  er: 'ER Diagram',
  class: 'Class Diagram',
  other: 'Code Only',
};

export const STARTER_TEMPLATES: Record<DiagramType, string> = {
  flowchart: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]
    C --> D`,
  sequence: `sequenceDiagram
    participant A as Service A
    participant B as Service B
    A->>B: Request
    B-->>A: Response`,
  state: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: start
    Processing --> Done: complete
    Done --> [*]`,
  er: `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "is in"`,
  class: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +fetch()
    }
    Animal <|-- Dog`,
  other: `graph TD
    A[Hello] --> B[World]`,
};
