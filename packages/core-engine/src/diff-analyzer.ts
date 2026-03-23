import type { ParsedSymbol, ChangeSet, ModifiedSymbol } from "./types.js";
import { parseDiff, type DiffFile } from "./diff-parser.js";

export type ParseFn = (filePath: string, content: string) => ParsedSymbol[];

export interface AnalyzerInput {
  diff: string;
  getFileContent: (path: string, ref: "old" | "new") => Promise<string | null>;
  parseFn: ParseFn;
}

export async function analyzeDiff(input: AnalyzerInput): Promise<ChangeSet[]> {
  const diffFiles = parseDiff(input.diff);
  const tsFiles = diffFiles.filter((f) => isTypeScriptFile(f.newPath) || isTypeScriptFile(f.oldPath));

  const changeSets: ChangeSet[] = [];

  for (const file of tsFiles) {
    const changeSet = await analyzeFile(file, input);
    if (changeSet) {
      changeSets.push(changeSet);
    }
  }

  return changeSets;
}

async function analyzeFile(file: DiffFile, input: AnalyzerInput): Promise<ChangeSet | null> {
  const filePath = file.status === "deleted" ? file.oldPath : file.newPath;

  if (file.status === "added") {
    const newContent = await input.getFileContent(file.newPath, "new");
    if (!newContent) return null;

    const newSymbols = input.parseFn(file.newPath, newContent);
    return {
      filePath: file.newPath,
      added: newSymbols,
      removed: [],
      modified: [],
    };
  }

  if (file.status === "deleted") {
    const oldContent = await input.getFileContent(file.oldPath, "old");
    if (!oldContent) return null;

    const oldSymbols = input.parseFn(file.oldPath, oldContent);
    return {
      filePath: file.oldPath,
      added: [],
      removed: oldSymbols,
      modified: [],
    };
  }

  const [oldContent, newContent] = await Promise.all([
    input.getFileContent(file.oldPath, "old"),
    input.getFileContent(file.newPath, "new"),
  ]);

  if (!oldContent || !newContent) return null;

  const oldSymbols = input.parseFn(file.oldPath, oldContent);
  const newSymbols = input.parseFn(file.newPath, newContent);

  return diffSymbols(filePath, oldSymbols, newSymbols);
}

function diffSymbols(
  filePath: string,
  oldSymbols: ParsedSymbol[],
  newSymbols: ParsedSymbol[],
): ChangeSet {
  const oldMap = new Map(oldSymbols.map((s) => [symbolKey(s), s]));
  const newMap = new Map(newSymbols.map((s) => [symbolKey(s), s]));

  const added: ParsedSymbol[] = [];
  const removed: ParsedSymbol[] = [];
  const modified: ModifiedSymbol[] = [];

  for (const [key, newSym] of newMap) {
    const oldSym = oldMap.get(key);
    if (!oldSym) {
      added.push(newSym);
    } else if (hasSymbolChanged(oldSym, newSym)) {
      modified.push({ before: oldSym, after: newSym });
    }
  }

  for (const [key, oldSym] of oldMap) {
    if (!newMap.has(key)) {
      removed.push(oldSym);
    }
  }

  return { filePath, added, removed, modified };
}

function symbolKey(symbol: ParsedSymbol): string {
  return `${symbol.kind}:${symbol.name}`;
}

function hasSymbolChanged(a: ParsedSymbol, b: ParsedSymbol): boolean {
  if (a.returnType !== b.returnType) return true;
  if (a.exported !== b.exported) return true;

  const aParams = a.parameters ?? [];
  const bParams = b.parameters ?? [];

  if (aParams.length !== bParams.length) return true;

  for (let i = 0; i < aParams.length; i++) {
    const ap = aParams[i]!;
    const bp = bParams[i]!;
    if (ap.name !== bp.name || ap.type !== bp.type || ap.optional !== bp.optional) {
      return true;
    }
  }

  return false;
}

function isTypeScriptFile(path: string): boolean {
  return /\.tsx?$/.test(path) && !path.endsWith(".d.ts");
}
