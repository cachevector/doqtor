import type { ChangeSet, DocReference } from "@doqtor/core-engine";

export interface DocFile {
  path: string;
  content: string;
}

export interface MatcherInput {
  changeSets: ChangeSet[];
  docFiles: DocFile[];
}

export function matchDocs(input: MatcherInput): DocReference[] {
  const references: DocReference[] = [];

  for (const changeSet of input.changeSets) {
    const allSymbols = [...changeSet.added, ...changeSet.removed, ...changeSet.modified.flatMap((m) => [m.before, m.after])];
    const uniqueNames = [...new Set(allSymbols.map((s) => s.name))];

    for (const docFile of input.docFiles) {
      const lines = docFile.content.split("\n");

      for (const symbolName of uniqueNames) {
        const nameMatches = findSymbolInDoc(lines, symbolName, docFile.path);
        references.push(...nameMatches);
      }

      const proximityMatches = findByProximity(lines, changeSet.filePath, docFile.path);
      references.push(...proximityMatches);
    }
  }

  return deduplicateReferences(references);
}

function findSymbolInDoc(lines: string[], symbolName: string, docPath: string): DocReference[] {
  const refs: DocReference[] = [];
  const baseName = symbolName.includes(".") ? symbolName.split(".").pop()! : symbolName;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (containsSymbol(line, baseName)) {
      const { start, end } = getContextRange(lines, i);
      refs.push({
        docFilePath: docPath,
        lineStart: start + 1,
        lineEnd: end + 1,
        symbolName,
        matchType: "name",
        content: lines.slice(start, end + 1).join("\n"),
      });
    }
  }

  return refs;
}

function containsSymbol(line: string, name: string): boolean {
  const wordBoundary = new RegExp(`\\b${escapeRegex(name)}\\b`);
  return wordBoundary.test(line);
}

function findByProximity(
  lines: string[],
  codeFilePath: string,
  docPath: string,
): DocReference[] {
  const refs: DocReference[] = [];
  const codeFileName = codeFilePath.split("/").pop()?.replace(/\.tsx?$/, "") ?? "";

  if (!codeFileName) return refs;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (containsSymbol(line, codeFileName) || line.includes(codeFilePath)) {
      const { start, end } = getContextRange(lines, i);
      refs.push({
        docFilePath: docPath,
        lineStart: start + 1,
        lineEnd: end + 1,
        symbolName: codeFileName,
        matchType: "proximity",
        content: lines.slice(start, end + 1).join("\n"),
      });
    }
  }

  return refs;
}

function getContextRange(lines: string[], lineIndex: number): { start: number; end: number } {
  let start = lineIndex;
  let end = lineIndex;

  const inCodeBlock = isInsideCodeBlock(lines, lineIndex);

  if (inCodeBlock) {
    while (start > 0 && !lines[start - 1]!.startsWith("```")) {
      start--;
    }
    if (start > 0) start--;

    while (end < lines.length - 1 && !lines[end + 1]!.startsWith("```")) {
      end++;
    }
    if (end < lines.length - 1) end++;
  } else {
    while (start > 0 && lines[start - 1]!.trim() !== "") {
      start--;
    }
    while (end < lines.length - 1 && lines[end + 1]!.trim() !== "") {
      end++;
    }
  }

  return { start, end };
}

function isInsideCodeBlock(lines: string[], lineIndex: number): boolean {
  let codeBlockOpen = false;
  for (let i = 0; i < lineIndex; i++) {
    if (lines[i]!.startsWith("```")) {
      codeBlockOpen = !codeBlockOpen;
    }
  }
  return codeBlockOpen;
}

function deduplicateReferences(refs: DocReference[]): DocReference[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.docFilePath}:${ref.lineStart}:${ref.lineEnd}:${ref.symbolName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
