import {
  ClassIR,
  ClassLine,
  ClassNode,
  ClassMember,
  ClassRelation,
  ClassRelationType,
} from '../ir';

const RELATION_PATTERNS: Array<{ pattern: string; type: ClassRelationType }> = [
  { pattern: '<|--', type: 'inheritance' },
  { pattern: '*--',  type: 'composition' },
  { pattern: 'o--',  type: 'aggregation' },
  { pattern: '-->',  type: 'association' },
  { pattern: '..>',  type: 'dependency' },
  { pattern: '..|>', type: 'realization' },
  { pattern: '--',   type: 'link' },
  { pattern: '..',   type: 'dashed_link' },
];

function parseMember(line: string): ClassMember | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let visibility = '';
  let rest = trimmed;
  if (/^[+\-#~]/.test(rest)) {
    visibility = rest[0];
    rest = rest.slice(1).trim();
  }

  const isMethod = rest.includes('(');

  // Try to separate type from name
  // Patterns: "String name", "name", "makeSound()", "int age"
  if (isMethod) {
    return { visibility, name: rest, type: '', isMethod: true };
  }

  const parts = rest.split(/\s+/);
  if (parts.length >= 2) {
    return { visibility, name: parts.slice(1).join(' '), type: parts[0], isMethod: false };
  }

  return { visibility, name: rest, type: '', isMethod: false };
}

export function parseClass(code: string): ClassIR {
  const rawLines = code.split('\n');
  const lines: ClassLine[] = [];
  const classes = new Map<string, ClassNode>();
  const relations: ClassRelation[] = [];
  let headerRaw = '';
  let currentClass: string | null = null;

  for (const rawLine of rawLines) {
    const indent = rawLine.match(/^(\s*)/)?.[1] ?? '';
    const trimmed = rawLine.trim();

    if (!trimmed) {
      lines.push({ type: 'empty', raw: rawLine, indent });
      continue;
    }

    if (trimmed === 'classDiagram') {
      headerRaw = rawLine;
      lines.push({ type: 'directive', raw: rawLine, indent });
      continue;
    }

    if (trimmed.startsWith('%%')) {
      lines.push({ type: 'comment', raw: rawLine, indent });
      continue;
    }

    // Class block start: class ClassName {
    const classStartMatch = trimmed.match(/^class\s+(\S+)\s*\{?\s*$/);
    if (classStartMatch) {
      const name = classStartMatch[1];
      if (!classes.has(name)) {
        classes.set(name, { name, members: [], raw: [rawLine] });
      }
      if (trimmed.includes('{')) {
        currentClass = name;
      }
      lines.push({ type: 'class_start', raw: rawLine, indent, className: name });
      continue;
    }

    // Class block end
    if (trimmed === '}' && currentClass) {
      const cls = classes.get(currentClass);
      if (cls) cls.raw.push(rawLine);
      lines.push({ type: 'class_end', raw: rawLine, indent, className: currentClass });
      currentClass = null;
      continue;
    }

    // Member inside class block
    if (currentClass) {
      const member = parseMember(trimmed);
      if (member) {
        const cls = classes.get(currentClass)!;
        cls.members.push(member);
        cls.raw.push(rawLine);
        lines.push({ type: 'member', raw: rawLine, indent, className: currentClass, member });
        continue;
      }
    }

    // Annotation: <<interface>> ClassName
    if (trimmed.match(/^<<\w+>>/)) {
      lines.push({ type: 'annotation', raw: rawLine, indent });
      continue;
    }

    // Relationship: ClassA <|-- ClassB : label
    let foundRelation = false;
    for (const { pattern, type } of RELATION_PATTERNS) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const relRegex = new RegExp(`^(\\S+)\\s+${escaped}\\s+(\\S+)(?:\\s*:\\s*(.+))?$`);
      const relMatch = trimmed.match(relRegex);
      if (relMatch) {
        const classA = relMatch[1];
        const classB = relMatch[2];

        if (!classes.has(classA)) {
          classes.set(classA, { name: classA, members: [], raw: [] });
        }
        if (!classes.has(classB)) {
          classes.set(classB, { name: classB, members: [], raw: [] });
        }

        const rel: ClassRelation = {
          classA,
          classB,
          relationType: type,
          label: relMatch[3] || '',
          raw: rawLine,
        };
        relations.push(rel);
        lines.push({ type: 'relation', raw: rawLine, indent, relation: rel });
        foundRelation = true;
        break;
      }
    }
    if (foundRelation) continue;

    lines.push({ type: 'unknown', raw: rawLine, indent });
  }

  return { headerRaw, lines, classes, relations };
}
